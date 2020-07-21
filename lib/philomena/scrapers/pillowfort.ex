defmodule Philomena.Scrapers.Pillowfort do
  @url_regex ~r|\Ahttps?://www.pillowfort.social/posts/(\d+)/?|

  @spec can_handle?(URI.t(), String.t()) :: true | false
  def can_handle?(_uri, url) do
    String.match?(url, @url_regex)
  end

  def scrape(_uri, url) do
    api_response!(url)
    |> extract_data()
  end

  defp extract_data(post) do
    if Enum.count(post["media"]) > 0 do
      images =
        post["media"]
        |> Enum.filter(fn(x) -> x["media_type"] == "picture" and x["url"] end)
        |> Enum.map(
          &%{
            url: &1["url"],
            camo_url: Camo.Image.image_url(&1["url"])
          }
        )

      %{
        source_url: "https://www.pillowfort.social/posts/#{post["id"]}",
        author_name: post["username"],
        description: HtmlSanitizeEx.strip_tags(post["content"]),
        images: images
      }
    end
  end

  def api_response!(url) do
    [post_id] = Regex.run(@url_regex, url, capture: :all_but_first)

    api_url =
      "https://www.pillowfort.social/posts/#{post_id}/json/"

    url = "https://www.pillowfort.social/posts/#{post_id}"

    Philomena.Http.get!(api_url, [{"Accept", "application/json"}])
    |> Map.get(:body)
    |> Jason.decode!()
    |> Map.put("url", url)
  end
end
