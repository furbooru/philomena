use rustler::{Encoder, Env, Error, Term};
use comrak::{markdown_to_html, ComrakOptions};

mod atoms {
    use rustler::rustler_atoms;
    rustler_atoms! {
        atom ok;
    }
}

rustler::rustler_export_nifs! {
    "Elixir.Philomena.Markdown",
    [
      ("to_html", 1, to_html_simple),
      ("to_html", 2, to_html_raw),
    ],
    None
}

fn to_html_simple<'a>(env: Env<'a>, args: &[Term<'a>]) -> Result<Term<'a>, Error> {
  let text: String = args[0].decode()?;
  let mut options = ComrakOptions::default();
  options.extension.autolink = true;
  options.extension.table = true;
  options.extension.description_lists = true;
  options.extension.superscript = true;
  options.extension.subscript = true;
  options.extension.spoiler = true;
  options.extension.furbooru = true;
  let result = markdown_to_html(&text, &options);

  Ok((atoms::ok(), result).encode(env))
}

fn to_html_raw<'a>(env: Env<'a>, args: &[Term<'a>]) -> Result<Term<'a>, Error> {
  let text: String = args[0].decode()?;
  let raw: bool = args[1].decode()?;

  let mut options = ComrakOptions::default();
  options.extension.autolink = true;
  options.extension.table = true;
  options.extension.description_lists = true;
  options.extension.superscript = true;
  options.extension.subscript = true;
  options.extension.spoiler = true;
  options.extension.furbooru = true;

  if raw {
    options.render.unsafe_ = true;
  }

  let result = markdown_to_html(&text, &options);

  Ok((atoms::ok(), result).encode(env))
}
