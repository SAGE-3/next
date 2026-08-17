# FAQ

- **What is the upload file size limit?**
  - Currently PDF files are limited to 100MB (to avoid rendering issues with very large files) and all other files are limited to 5GB. Let us know if you need larger files. We might make the limit configurable in the future.

- **How to get the PowerPoint presenter view on my laptop during screen sharing?**
  - in PowerPoint, there is button on the “slide show” ribbon called “Presenter View”. When you press it, PPT opens 3 windows:  presenter view, slideshow view, and regular editor view. In SAGE3, you just share the slideshow view window. Then bring the presenter view forward on the laptop and give the presentation. It should also work for Zoom a presentation.

- **How to understand the applications placement on a large wall (or board) from my laptop?**
  - You should select the type 'Wall' on the user connected to the wall (or public display). In the home page or inside a board, select the user menu at the bottom left of the screen and select the menu 'Account'. In the popup, switch the 'Type' from 'Client' to 'Wall', and select 'Update'. Now all the remote users will have an representation of the 'wall' viewport (it is updated interactively). Moreover, the icon at the bottom left is now a 'grid' icon.

![wall](images/faq/faq_wall_viewport.jpeg)

- **On a public information display, can I hide the user interface (menu, panels, ...)?**
  - Yes, you can hide most of the UI: inside a board, using the right-click menu and deselect ‘Show Interface’. Other clients will still see the UI.

![Screenshot 2024-01-22 at 6 36 03 PM](images/faq/faq_hide_interface.jpeg)


- **During a class or a large meeting, there might be a lot of cursor activity and it can be distracting?**
  - You can hide cursors when this becomes distracting: using the right-click menu and deselect ‘Show Presence’. The local mouse cursor will still be visible.

![Screenshot 2024-01-22 at 6 36 03 PM](images/faq/faq_hide_interface.jpeg)

- **Can I display images for transparency, like a PNG file a transparent background?**
  - No, currently images always have a gray background added. We are currently working on adding support for transparency.

- **How can I check my SSL certificate file for the HTTPS web server?**
  - A PEM encoded file includes Base64 data. The private key is prefixed with a "-----BEGIN PRIVATE KEY-----" line and postfixed with an "-----END PRIVATE KEY-----". Certificates are prefixed with a "-----BEGIN CERTIFICATE-----" line and postfixed with an "-----END CERTIFICATE-----" line. Between 'BEGIN' and 'END' blocks (you can have a chain of certificate) you have base64 data encoding the values.
  - You can run the following command to see the list of subjects and issuing authorities from your certificate file:
    - `openssl crl2pkcs7 -nocrl -certfile **[CERT FILE]** | openssl pkcs7 -print_certs -noout`

```
-----BEGIN CERTIFICATE-----
XXXXX
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
YYYYY
-----END CERTIFICATE-----
```

- **How can I check that my SSL certificate matches my private key?**
  - You can run openssl commands to verify the modulus of each file is the same
  - For the certificate file: `openssl x509 -noout -modulus [CERT FILE]`
  - For the key file: `openssl rsa -noout -modulus -in [KEY FILE]`
  - The output of each command should be EXACTLY the same

- **Can I run the SAGE3 client on Linux while AppArmor is enabled?**
  - It seems that Ubuntu 23.x and 24.x have AppArmor enabled and it causes issues with Chrome/Electron based application using sandboxes.
  - Install the latest version of the client.
  - as root, create a file in `/etc/apparmor.d/`:
    - file name can/should be (?) the path to the application binary: for instance `home.luc.SAGE3-linux-x64.SAGE3`
    - the file content is copied from the Chrome one, adjusted for the binary path (see below)
  - Then add the file into AppArmor:
    - as root: `sudo apparmor_parser -r /etc/apparmor.d/home.luc.SAGE3-linux-x64.SAGE3`
  - Go back to the SAGE3 folder and run './SAGE3'

```
abi <abi/4.0>,
include <tunables/global>

/home/luc/SAGE3-linux-arm64/SAGE3 flags=(unconfined) {
  userns,
}
```

- **On macOS, what to do if I can't get to the SAGE3 window (the client disappeared)?**
  - You can go to the menu bar and select 'File / Clear Preferences on Quit' and quit the SAGE3 client and relaunch it. The preferences should have been cleaned, and you can restart fresh.
![Screenshot 2023-11-29 at 11 43 02 AM](images/faq/faq_clear_preferences.jpeg)
- **What ports need to be open for communication with the SAGE3 server, what encryption and protocols are used and what authentication?**
  - Only the HTTPS port (443) is required to be open. All the communications are initiated with over HTTPS using TLS 1.2.  We use HTTPS calls, secure Websocket communication and peer-to-peer communications (WebRTC), all initiated over HTTPS. Screen-sharing is mediated through a commercial entity (Twilio, for signaling through VPN and such), also over HTTPS.
  - We rely on  delegated authentication services for login: we mostly support Google auth and CILogon which supports a long list of universities and institutions. It's mostly based on a OpenID Connect (OAuth 2.0) interface. Test at: https://test.cilogon.org/
  - We have a simple PIN code system to limit access to some rooms and boards (SHA-1 hash) which should not be considered as a strong password.
  - In the configuration file, you can specify the email of several admin-level users, who can access an administrative page for maintenance and debugging.

- **Is the content of webview (web content) synchronized across clients?**
  - The URL and navigation (back/forward) are synchronized, but scroll position is local to each user.
  - For full synchronized browser control (including shared interaction), use the **CoBrowser** app via the Electron client, which streams the browser view to all users.

- **Can I be logged in 2 clients at once?**
  - Yes, you should be able to login in multiple clients at once (for instance, in a classroom setting, you can login on the public display client (wall display, TV, projector) and on your laptop. Then, you can share you laptop to the public display using `screensharing`.  Your `presence` values (pointer, viewport) might temporarily confused if you use both keyboard/mouse.

- **How to develop or run the Electron client from sources**
  - https://github.com/SAGE-3/next/wiki/Electron-client

- **What are the command line arguments for the Electron client**
```
Usage: electron [options]

Options:
  -V, --version              output the version number
  -d, --display <n>          Display client ID number (int) (default: 0)
  -f, --fullscreen           Fullscreen (boolean) (default: false)
  -m, --monitor <n>          Select a monitor (int) (default: null)
  -n, --no_decoration        Remove window decoration (boolean) (default: false)
  -s, --server <s>           Server URL (string) (default: "https://minim1.evl.uic.edu/#/home")
  -x, --xorigin <n>          Window position x (int) (default: 226)
  -y, --yorigin <n>          Window position y (int) (default: 38)
  -c, --clear                Clear window preferences (default: false)
  --allowDisplayingInsecure  Allow displaying of insecure content (http on https) (default: true)
  --allowRunningInsecure     Allow running insecure content (scripts accessed on http vs https) (default:
                             true)
  --cache                    Clear the cache at startup (default: false)
  --console                  Open the devtools console (default: false)
  --debug                    Open the port debug protocol (port number is 9222 + clientID) (default:
                             false)
  --experimentalFeatures     Enable experimental features (default: false)
  --height <n>               Window height (int) (default: 944)
  --disable-hardware         Disable hardware acceleration (default: false)
  --show-fps                 Display the Chrome FPS counter (default: false)
  --profile <s>              Create a profile (string)
  --width <n>                Window width (int) (default: 1061)
  -h, --help                 display help for command
```

- **How to logout from the client or switch login account?**
  - You can logout using the bottom left button labelled with your user name: the bottom menu item is the `logout` action.
  - The top 'Account' menu item allows to check and change some of your user settings (you display name, your default color, you user type as client or wall, your login authority, and check your login expiration (usually from 1 month to 1 year, depending on the server settings).

- **What are the main SAGE3 features?**
  - See the [SAGE3 Features](Home.md) wiki page.

- **Is there a Quick Start guide?**
  - See the [Quick Start Guide](Quick-Start-Guide.md) wiki page.

- **What are the included applications?**
  - See the [Applications](Applications.md) wiki page.

- **What are the keyboard shortcuts available?**
  - See the [Shortcuts](Shortcuts.md) wiki page.

- **Where can I download the binary client for my machine?**
  - https://sage3.sagecommons.org/?page_id=719

- **GPU recommendations for tiled display wall?**
  - AMD: no idea currently
  - Nvidia for 'many displays'
    - single slot card: 'NVIDIA RTX A4000' ~ $1,000 (because inexpensive, 4 display-port at 4K 120Hz, mosaic). 'Ada' version might be around $1,500 (Summer 2023)
    - dual slot 'maximum perf' expensive: 'NVIDIA RTX A6000' or 'NVIDIA RTX A6000/50000/4500 Ada'
  - Nvidia for a couple of TVs
    - any GeForce should be Ok, 3080, 4080, ...
