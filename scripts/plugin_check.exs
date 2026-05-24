#!/usr/bin/env elixir
# scripts/plugin_check.exs — examples/plugins/ の JS ファイルを検証する
#
# 使い方: elixir scripts/plugin_check.exs

defmodule PluginChecker do
  @plugins_dir Path.join([__DIR__, "..", "examples", "plugins"])

  @required_headers ["@name", "@description"]
  @required_apis    [~r/hue\.contextMenu\.add|hue\.shortcuts\.add/]

  def run do
    files = Path.wildcard(Path.join(@plugins_dir, "*.js"))

    if files == [] do
      IO.puts("No plugin files found in #{@plugins_dir}")
      System.halt(1)
    end

    results = Enum.map(files, &check_file/1)
    errors  = Enum.filter(results, fn {status, _, _} -> status == :error end)

    Enum.each(results, &print_result/1)

    IO.puts("")
    IO.puts("#{length(files)} plugins checked, #{length(errors)} error(s)")

    if errors != [], do: System.halt(1)
  end

  defp check_file(path) do
    name    = Path.basename(path)
    content = File.read!(path)
    issues  = check_headers(content) ++ check_apis(content)

    if issues == [] do
      {:ok, name, []}
    else
      {:error, name, issues}
    end
  end

  defp check_headers(content) do
    Enum.flat_map(@required_headers, fn header ->
      if String.contains?(content, "// #{header}") do
        []
      else
        ["missing #{header} comment"]
      end
    end)
  end

  defp check_apis(content) do
    if Enum.any?(@required_apis, &Regex.match?(&1, content)) do
      []
    else
      ["no hue API calls found (contextMenu.add or shortcuts.add)"]
    end
  end

  defp print_result({:ok,    name, _})      , do: IO.puts("  ✓  #{name}")
  defp print_result({:error, name, issues}) do
    IO.puts("  ✗  #{name}")
    Enum.each(issues, fn i -> IO.puts("       - #{i}") end)
  end
end

PluginChecker.run()
