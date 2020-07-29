use comrak::{markdown_to_html, ComrakOptions};
use lazy_static::lazy_static;
use regex::{Captures, Regex};
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

const IMAGE_MENTION_REGEX: &'static str = r#"&gt;&gt;([0-9]+)([|t|s|p]?)"#;

lazy_static! {
    static ref IMAGE_MENTION_REPLACE: Regex = Regex::new(IMAGE_MENTION_REGEX).unwrap();
}

fn to_html_simple<'a>(env: Env<'a>, args: &[Term<'a>]) -> Result<Term<'a>, Error> {
    let _ = pretty_env_logger::try_init();
    let mut text: String = args[0].decode()?;

    if text.contains(">>") {
        text = text.replace(">>", "&gt;&gt;");
    }

    let mut options = ComrakOptions::default();
    options.extension.autolink = true;
    options.extension.table = true;
    options.extension.description_lists = true;
    options.extension.superscript = true;
    options.extension.subscript = true;
    options.extension.spoiler = true;
    options.extension.furbooru = true;
    let mut result = markdown_to_html(&text, &options);

    result = match IMAGE_MENTION_REPLACE.captures(&result) {
        None => result,
        Some(fields) => {
            match fields.get(2).unwrap().as_str() {
                "t" => result, // TODO(Xe): thumbnail rendering
                "s" => result, // TODO(Xe): small preview rendering
                "p" => result, // TODO(Xe): large preview rendering
                "" => String::from(
                    IMAGE_MENTION_REPLACE.replace_all(&result, |caps: &Captures| {
                        format!(r#"<a href="/{0}">&gt;&gt;{0}</a>"#, &caps[1])
                    }),
                ),
                _ => result,
            }
        }
    };

    Ok((atoms::ok(), result).encode(env))
}

fn to_html_raw<'a>(env: Env<'a>, args: &[Term<'a>]) -> Result<Term<'a>, Error> {
    let mut text: String = args[0].decode()?;
    let raw: bool = args[1].decode()?;

    if text.contains(">>") {
        text = text.replace(">>", "&gt;&gt;");
    }

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
