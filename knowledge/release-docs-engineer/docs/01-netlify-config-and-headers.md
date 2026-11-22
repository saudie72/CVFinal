# Netlify file-based configuration and headers

**Sources:** Netlify file-based configuration: https://docs.netlify.com/build/configure-builds/file-based-configuration/ · Custom headers: https://docs.netlify.com/manage/routing/headers/ · Knowledge base (netlify.toml redirects, headers, env vars): https://www.netlify.com/knowledge-base/how-to-configure-netlifytoml-redirects-headers-and-env-vars/

## Facts
- `netlify.toml` is normally at the **repository root**. It configures the build, redirects, headers and more.
- **File-based settings override the Netlify UI** when the two conflict.
- The `netlify.toml` isn't comprehensive: some settings exist only in the UI, CLI or API.
- Headers can be set with `[[headers]]` tables (`for = "/*"`, `[headers.values]`) or with a `_headers` file in the publish directory.
- Headers declared in `_headers` or `netlify.toml` are **global**. They can't be scoped to a branch or deploy context.
- `_headers` and `_redirects` are processed before `netlify.toml` rules, and for redirects the **first match wins**.

## Our deploy (course guide)
Add new project → Import an existing project → GitHub → `CVFinal` → build command **empty**, publish directory **`.`**, no environment variables → Deploy. Every push to `main` redeploys.

## Example 1 verified
`ex1-netlify.toml` parses with Python `tomllib`, and all five required settings pass (`validate_examples.py`).
