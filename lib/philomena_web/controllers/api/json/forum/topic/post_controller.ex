defmodule PhilomenaWeb.Api.Json.Forum.Topic.PostController do
  use PhilomenaWeb, :controller

  alias Philomena.Forums.Forum
  alias Philomena.Posts.Post
  alias Philomena.Posts
  alias Philomena.Topics.Topic
  alias Philomena.Repo
  alias Philomena.UserStatistics
  import Ecto.Query

  plug PhilomenaWeb.ApiRequireAuthorizationPlug when action in [:create]
  plug PhilomenaWeb.UserAttributionPlug when action in [:create]

  def index(conn, %{"forum_id" => forum_id, "topic_id" => topic_id}) do
    page = conn.assigns.pagination.page_number

    posts =
      Post
      |> join(:inner, [p], _ in assoc(p, :topic))
      |> join(:inner, [_p, t], _ in assoc(t, :forum))
      |> where(destroyed_content: false)
      |> where([_p, t], t.hidden_from_users == false and t.slug == ^topic_id)
      |> where([_p, _t, f], f.access_level == "normal" and f.short_name == ^forum_id)
      |> where([p], p.topic_position >= ^(25 * (page - 1)) and p.topic_position < ^(25 * page))
      |> order_by(asc: :topic_position)
      |> preload([:user, :topic])
      |> preload([_p, t, _f], topic: t)
      |> Repo.all()

    render(conn, "index.json", posts: posts, total: hd(posts).topic.post_count)
  end

  def show(conn, %{"forum_id" => forum_id, "topic_id" => topic_id, "id" => post_id}) do
    post =
      Post
      |> join(:inner, [p], _ in assoc(p, :topic))
      |> join(:inner, [_p, t], _ in assoc(t, :forum))
      |> where(id: ^post_id)
      |> where(destroyed_content: false)
      |> where([_p, t], t.hidden_from_users == false and t.slug == ^topic_id)
      |> where([_p, _t, f], f.access_level == "normal" and f.short_name == ^forum_id)
      |> preload([:user, :topic])
      |> Repo.one()

    if is_nil(post) do
      conn
      |> put_status(:not_found)
      |> text("")
    else
      render(conn, "show.json", post: post)
    end
  end

  def create(conn, %{"forum_id" => forum_id, "topic_id" => topic_id, "post" => post_params}) do
    attributes = conn.assigns.attributes

    topic =
      Topic
      |> join(:inner, [t], _ in assoc(t, :forum))
      |> where(slug: ^topic_id)
      |> where(hidden_from_users: false)
      |> where([_t, f], f.access_level == "normal" and f.short_name == ^forum_id)
      |> order_by(desc: :sticky, desc: :last_replied_to_at)
      |> preload([:user])
      |> Repo.one()

    forum =
      Forum
      |> where(short_name: ^forum_id)
      |> where(access_level: "normal")
      |> Repo.one()

    case Posts.create_post(topic, attributes, post_params) do
      {:ok, %{post: post}} ->
        Posts.notify_post(post)
        Posts.reindex_post(post)
        UserStatistics.inc_stat(conn.assigns.current_user, :forum_posts)

        if forum.access_level == "normal" do
          PhilomenaWeb.Endpoint.broadcast!(
            "firehose",
            "post:create",
            PhilomenaWeb.Api.Json.Forum.Topic.PostView.render("firehose.json", %{
                  post: post,
                  topic: topic,
                  forum: forum
            })
          )
        end

        render(conn, "show.json", post: post)

      {:error, :post, changeset, _} ->
        conn
        |> put_status(:bad_request)
        |> put_view(PhilomenaWeb.Api.Json.Forum.Topic.PostView)
        |> render("error.json", changeset: changeset)
    end
  end
end
