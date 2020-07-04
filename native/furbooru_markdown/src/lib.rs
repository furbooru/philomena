use rustler::{Encoder, Env, Error, Term};

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

  Ok((atoms::ok(), text).encode(env))
}

fn to_html_raw<'a>(env: Env<'a>, args: &[Term<'a>]) -> Result<Term<'a>, Error> {
  let text: String = args[0].decode()?;
  let raw: bool = args[1].decode()?;

  if raw {
    let message = format!("oh no you enabled raw mode: {}", text);
    Ok((atoms::ok(), message).encode(env))

  } else {
    Ok((atoms::ok(), text).encode(env))
  }
}
