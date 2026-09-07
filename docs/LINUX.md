# LumaReader on Linux

LumaReader 1.3.0 adds Linux x64 downloads in two formats:

- **Debian package (`.deb`)** for Ubuntu 22.04 and 24.04. Install it with the distribution's package installer. It adds a launcher and makes LumaReader available in **Open With**.
- **AppImage** for a portable copy. Give the downloaded file permission to run as a program, then open it. The release pipeline tests this format on Ubuntu 22.04 using extraction mode.

The app and its installers preserve an existing Markdown default. Choose a default reader yourself in your desktop environment's **Open With** or file-properties interface. LumaReader does not make that choice automatically.

For Chinese, Japanese, or Korean text, the system needs an appropriate font, such as the distribution's Noto CJK package. The Ubuntu test environments include `fonts-noto-cjk`.

## Compatibility and sandboxing

The release workflow builds once on Ubuntu 22.04, then installs the exact same `.deb` on Ubuntu 24.04. Both runs exercise the actual packaged interface: opening multiple Markdown files, editing and saving, authentication for the local server, PDF preferences, and automatic line wrapping. Tests also inspect renderer processes for active seccomp filters and `NoNewPrivs`, and check that installation and removal preserve existing MIME defaults. Xvfb provides an X11 display; these tests do not establish compatibility with every Linux distribution, Wayland session, graphics driver, or ARM device.

Ubuntu 24.04 restricts unprivileged user namespaces. The `.deb` uses electron-builder's bundled AppArmor profile for this application's installed executable. This permits Chromium's sandbox to initialize without turning off AppArmor globally. For Ubuntu 24.04, prefer the `.deb`; the portable AppImage is not covered by that installed-path profile. [Ubuntu AppArmor documentation](https://documentation.ubuntu.com/security/security-features/privilege-restriction/apparmor/)

AppImage mounting depends on the host's FUSE support. If mounting is unavailable on a compatible host, the AppImage runtime also supports extraction mode:

```sh
APPIMAGE_EXTRACT_AND_RUN=1 ./Kainnne-LumaReader-1.3.0-Linux-x64.AppImage
```

Extraction mode still requires a working Chromium sandbox. LumaReader's AppImage launcher preserves the sandbox and does not silently turn it off when the host disallows it. If the app cannot start because sandbox support is unavailable, use the `.deb` on a supported distribution instead of disabling the sandbox. [AppImage troubleshooting](https://docs.appimage.org/user-guide/troubleshooting/fuse.html), [Electron process sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox/)

Linux downloads are not signed distribution-repository packages. Download them from the official GitHub release and compare their SHA-256 hashes with the release's checksum file.
