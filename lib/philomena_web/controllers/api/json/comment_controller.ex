defmodule PhilomenaWeb.Api.Json.CommentController do
  use PhilomenaWeb, :controller

  alias Philomena.Comments.Comment
  alias Philomena.Comments
  alias Philomena.Repo
  import Ecto.Query

  plug PhilomenaWeb.ApiRequireAuthorizationPlug when action in [:update]
  plug PhilomenaWeb.UserAttributionPlug when action in [:update]

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

      not Canada.Can.can?(conn.assigns.current_user, :show, comment) ->
        conn
        |> put_status(:forbidden)
        |> text("")

      true ->
        render(conn, "show.json", comment: comment)
    end
  end

  def update(conn, %{"comment" => comment_params, "id" => comment_id}) do
    orig_comment =
      Comment
      |> where(id: ^comment_id)
      |> preload([:image, :user])
      |> Repo.one()

    cond do
      is_nil(orig_comment) or orig_comment.destroyed_content ->
        conn
        |> put_status(:not_found)
        |> text("")

      not Canada.Can.can?(conn.assigns.current_user, :show, orig_comment) ->
        conn
        |> put_status(:forbidden)
        |> text("")

      not Canada.Can.can?(conn.assigns.current_user, :update, orig_comment) ->
        conn
        |> put_status(:forbidden)
        |> text("")

      true ->
        case Comments.update_comment(orig_comment, conn.assigns.current_user, comment_params) do
          {:ok, %{comment: comment}} ->
            PhilomenaWeb.Endpoint.broadcast!(
              "firehose",
              "comment:update",
              PhilomenaWeb.Api.Json.CommentView.render("show.json", %{
                comment: comment,
                current_user: conn.assigns.current_user
              })
            )

            Comments.reindex_comment(comment)

            render(conn, "show.json", %{comment: comment, current_user: conn.assigns.current_user})

          {:error, :comment, changeset, _changes} ->
            conn
            |> put_status(:bad_request)
            |> render("error.json", changeset: changeset)
        end
    end
  end
end
