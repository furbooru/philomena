defmodule PhilomenaWeb.Search.AutocompleteController do
  use PhilomenaWeb, :controller

  alias Philomena.Elasticsearch
  alias Philomena.{Tags, Tags.Tag}
  alias PhilomenaWeb.Autocomplete

  def show(conn, params) do
    tags =
      case Autocomplete.normalize_query(params) do
        nil ->
          []

        term ->
          with {:ok, query} <- Tags.Query.compile(term) do
            Autocomplete.fetch_tags(%{
              query: query,
              sort: [%{images: :desc}, %{name: :asc}]
            })
          else
            {:error, msg} -> []
          end
      end

    conn
    |> json(tags)
  end
end
