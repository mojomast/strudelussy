## Strudel Source Disclosure

`strudelussy` ships and deploys code that depends on Strudel packages published under `AGPL-3.0`. The live app therefore needs a clear, public path to the corresponding source code of the version being run.

## Corresponding Source

- Repository: `https://github.com/mojomast/strudelussy`
- License: `https://github.com/mojomast/strudelussy/blob/main/LICENSE`
- Live deployment flow: `scripts/live_sync.sh` fast-forwards a dedicated live clone to `origin/main`, rebuilds `ui/dist`, and restarts the local proxy and worker.

As a result, the maintained public source for the deployed site is this repository's `main` branch.

## Embedded Strudel Reference Bundle

The chat system prompt includes a condensed Strudel reference assembled from the checked-in files under `server/src/lib/strudel-docs/`.

- Combined export: `server/src/lib/strudel-docs/index.ts`
- Section files: `server/src/lib/strudel-docs/*.ts`

## Chapter 10 Status

The file `server/src/lib/strudel-docs/10-full-song-examples.ts` is present in the repository, but it is currently a disabled placeholder and is not included in the combined `STRUDEL_DOCS` export.

That means the current checked-in server prompt does not ship a hidden full chapter 10 bundle. If older deployments or earlier prompt drafts referenced "full song examples," this repository should now be treated as the source of truth:

- `10-full-song-examples.ts` exists
- it is intentionally not imported into `STRUDEL_DOCS`
- the deployed app should expose this repository and license links directly in the UI

## Maintainer Note

If the live deployment process changes away from `origin/main`, update the in-app `Source` link and this file so users can still retrieve the exact corresponding source for the running version.
