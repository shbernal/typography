# Terminal demo for the README: check, fix, check again with the real CLI.
# Render from this directory with: vhs demo.tape (or ./demo.sh where vhs
# cannot encode a GIF itself)
Output demo.gif

Set Shell "bash"
Set Theme "Catppuccin Mocha"
Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 16
Set LineHeight 1.2
Set Width 1280
Set Height 720
Set Padding 24
Set Margin 0
Set WindowBar Colorful
Set BorderRadius 8
Set TypingSpeed 30ms
Set Framerate 20
Set PlaybackSpeed 1

# Setup, not recorded: point typocheck at the repo CLI (Node 24 strips the
# types) and write a sample the way a model might set it. The bytes go in as
# octal escapes so no special character is pasted into this file.
Hide
Type `bind 'set show-mode-in-prompt off' && export PS1='\[\e[1;35m\]$\[\e[0m\] ' && alias typocheck="node $(realpath ../src/cli.ts)"`
Enter
Type "cd $(mktemp -d) && printf 'L\047agent dit : \302\253 Bonjour \302\273\nTapez \140a : b\140 ici.\n' > sample.md && clear"
Enter
Sleep 500ms
Show

Type "cat sample.md"
Sleep 300ms
Enter
Sleep 700ms
Type "typocheck check --style fr sample.md"
Sleep 300ms
Enter
Sleep 3.5s

Hide
Type "clear"
Enter
Sleep 200ms
Show

Type "typocheck fix --style fr --write sample.md"
Sleep 300ms
Enter
Sleep 1.5s
Type "cat sample.md"
Sleep 300ms
Enter
Sleep 700ms
Type "typocheck check --style fr sample.md"
Sleep 300ms
Enter
Sleep 3.5s
