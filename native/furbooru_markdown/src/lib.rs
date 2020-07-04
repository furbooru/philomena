use rustler::{Env, Error, Term, Encoder};

mod atoms {
    use rustler::rustler_atoms;
    rustler_atoms! {
        atom ok;
    }
}

rustler::rustler_export_nifs! {
    "Elixir.Furbooru.Markdown",
    [
        ("add", 2, add)
    ],
    None
}

fn add<'a>(env: Env<'a>, args: &[Term<'a>]) -> Result<Term<'a>, Error> {
    let num1: i64 = args[0].decode()?;
    let num2: i64 = args[1].decode()?;

    Ok((atoms::ok(), num1 + num2).encode(env))
}
