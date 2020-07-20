defmodule PhilomenaWeb.Api.Json.CommentController do
  use PhilomenaWeb, :controller

  alias Philomena.{Images.Image, Comments.Comment}
  alias Philomena.Comments
  alias Philomena.Images
  alias Philomena.Repo
  alias Philomena.UserStatistics
  import Ecto.Query

  plug PhilomenaWeb.ApiRequireAuthorizationPlug when action in [:create]
  plug PhilomenaWeb.UserAttributionPlug when action in [:create]

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
      |> preload([:tags, :user, :intensity])
      |> Repo.one()

    cond do
      is_nil(image) ->
        conn
        |> put_status(:not_found)
        |> text("")

      not Canada.Can.can?(conn.assigns.current_user, :create_comment, image) ->
        conn
        |> put_status(:forbidden)
        |> text("")

      true ->
        case Comments.create_comment(image, attributes, comment_params) do
          {:ok, %{comment: comment}} ->
            PhilomenaWeb.Endpoint.broadcast!(
              "firehose",
              "comment:create",
              PhilomenaWeb.Api.Json.CommentView.render("show.json",
                comment: comment,
                current_user: conn.assigns.current_user
              )
            )

            Comments.notify_comment(comment)
            Comments.reindex_comment(comment)
            Images.reindex_image(image)
            UserStatistics.inc_stat(conn.assigns.current_user, :comments_posted)

            conn
            |> put_view(PhilomenaWeb.Api.Json.CommentView)
            |> render("show.json", comment: comment, current_user: conn.assigns.current_user)

          {:error, :comment, changeset, _} ->
            conn
            |> put_status(:bad_request)
            |> put_view(PhilomenaWeb.Api.Json.CommentView)
            |> render("error.json", changeset: changeset)
        end
    end
  end
end
