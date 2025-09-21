defmodule Philomena.Repo.Migrations.ChangeDefaultTagBorders do
  use Ecto.Migration

  def up do
    execute "ALTER TABLE users ALTER COLUMN borderless_tags SET DEFAULT true;"
    execute "UPDATE users SET borderless_tags = true;"
  end

  def down do
    execute "ALTER TABLE users ALTER COLUMN borderless_tags SET DEFAULT false;"
    execute "UPDATE users SET borderless_tags = false;"
  end
end
