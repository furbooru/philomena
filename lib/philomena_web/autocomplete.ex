defmodule PhilomenaWeb.Autocomplete do
  alias Philomena.Elasticsearch
  alias Philomena.Tags.Tag
  import Ecto.Query

  def fetch_tags(query) do
    Tag
    |> Elasticsearch.search_definition(
      query,
      %{page_size: 5}
    )
    |> Elasticsearch.search_records(preload(Tag, :aliased_tag))
    |> Enum.map(&(&1.aliased_tag || &1))
    |> Enum.uniq_by(& &1.id)
    |> Enum.sort_by(&(-&1.images_count))
    |> Enum.map(&%{label: "#{&1.name} (#{&1.images_count})", value: &1.name})
  end

  def normalize_query(%{"term" => term}) when is_binary(term) and byte_size(term) > 2 do
    term
    |> String.downcase()
    |> String.trim()
  end

  def normalize_query(_params), do: nil
end
