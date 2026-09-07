# Kainnne LumaReader 1.3.0

Read and edit local Markdown with clearer folder search, predictable wrapping, and more flexible PDF output.

- Folder indexing continues in bounded batches instead of dropping subfolders after the old scan limit. Incomplete, inaccessible, or cloud-backed folders have visible status and a refresh hint.
- Search matches document paths and folder names, handles Unicode normalization, and expands matching folders. Large results load in batches to keep the interface responsive.
- Comparison preview defaults to on after this upgrade. Source and editor text wrap to the available width in vertical views; subsequent preview choices are remembered.
- PDF export offers a selected, editable footer name. Keep **LumaReader**, enter your company, or leave it blank. Successful exports remember the choice across windows and restarts. The footer now sits at the bottom right with readable spacing.
- Add `<!-- lumareader:pagebreak -->` on its own line between sections to begin a new PDF page. See [PDF export instructions](https://github.com/kainnne/Kainnne-LumaReader/blob/v1.3.0/docs/PDF-EXPORT.md).
- Linux x64 is available as an AppImage and `.deb`. The release workflow verifies Ubuntu 22.04 and the same `.deb` on Ubuntu 24.04; prefer `.deb` on Ubuntu 24.04. See [Linux compatibility](https://github.com/kainnne/Kainnne-LumaReader/blob/v1.3.0/docs/LINUX.md).
- The website focuses on personal developers working with local documents. A more visible Web trial entry accompanies desktop downloads; Web download links select the current desktop platform directly.

macOS downloads are Universal, Developer ID signed and notarized. Windows x64 Setup and Portable downloads remain unsigned. Linux downloads are not signed distribution-repository packages. SHA-256 checksums accompany all downloads. File associations remain a manual choice in the operating system; installation and launch preserve an existing Markdown default.
