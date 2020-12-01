defmodule PhilomenaWeb.Tag.AutocompleteController do
  use PhilomenaWeb, :controller

  alias Philomena.Elasticsearch
  alias Philomena.Tags.Tag
  alias PhilomenaWeb.Autocomplete

  def show(conn, params) do
    tags =
      case Autocomplete.normalize_query(params) do
        nil ->
          []

        term ->
          Autocomplete.fetch_tags(%{
            query: %{
              bool: %{
                should: [
                  %{prefix: %{name: term}},
                  %{prefix: %{name_in_namespace: term}}
                ]
              }
            },
            sort: %{images: :desc}
          })
      end

    conn
    |> json(tags)
  end
end
