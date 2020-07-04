defmodule Philomena.Markdown do
  use Rustler, otp_app: :philomena, crate: "furbooru_markdown"

  # When your NIF is loaded, it will override this function.
  def to_html(_text), do: :erlang.nif_error(:nif_not_loaded)
  def to_html(_text, _raw), do: :erlang.nif_error(:nif_not_loaded)
end
