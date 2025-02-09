defmodule Philomena.Repo.Migrations.ConvertUserThemes do
  use Ecto.Migration

  def up do
    execute("update users set theme = 'dark-purple' where theme = 'default';")
    execute("update users set theme = 'dark-blue' where theme = 'dark';")
    execute("update users set theme = 'light-blue' where theme = 'light';")

    alter table("users") do
      modify :theme, :varchar, default: "dark-purple"
    end
  end

  def down do
    execute("update users set theme = 'light' where theme = 'light-blue';")
    execute("update users set theme = 'dark' where theme = 'dark-blue';")
    execute("update users set theme = 'default' where theme like 'dark-%' or theme like 'light-%';")

    alter table("users") do
      modify :theme, :varchar, default: "default"
    end
  end
end
