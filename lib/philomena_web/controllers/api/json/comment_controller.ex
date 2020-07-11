defmodule PhilomenaWeb.Api.Json.CommentController do
  use PhilomenaWeb, :controller

  alias Philomena.{Images.Image, Comments.Comment}
  alias Philomena.Comments
  alias Philomena.Images
  alias Philomena.Repo
  import Ecto.Query

  def show(conn, %{"id" => id}) do
    comment =
      Comment
      |> where(id: ^id)
      |> preload([:image, :user])
      |> Repo.one()

    cond do
      is_nil(comment) or comment.destroyed_content ->
        conn
        |> put_status(:not_found)
        |> text("")

      comment.image.hidden_from_users ->
        conn
        |> put_status(:forbidden)
        |> text("")

      true ->
        render(conn, "show.json", comment: comment)
    end
  end

  def create(conn, %{"comment" => comment_params, "image_id" => image_id}) do
    attributes = conn.assigns.attributes
    image =
      Image
      |> where(id: ^image_id)
      |> preload([:user])
      |> Repo.one()

    cond do
      is_nil(image) ->
        conn
        |> put_status(:not_found)
        |> text("")

      image.hidden_from_users ->
        conn
        |> put_status(:forbidden)
        |> text("")

      true ->
        case Comments.create_comment(image, attributes, comment_params) do
          {:ok, %{comment: comment}} ->
            PhilomenaWeb.Endpoint.broadcast!(
              "firehose",
              "comment:create",
              PhilomenaWeb.Api.Json.CommentView.render("show.json", %{comment: comment})
            )

            Comments.notify_comment(comment)
            Comments.reindex_comment(comment)
            Images.reindex_image(conn.assigns.image)
            UserStatistics.inc_stat(conn.assigns.current_user, :comments_posted)

            render(conn, "show.json", comment: comment, interactions: [])
          {:error, :comment, changeset, _} ->
            conn
            |> put_status(:bad_request)
            |> render("error.json", changeset: changeset)
        end
    end
  end
end
