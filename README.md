# Ghost Chat Multi Chat Version

This is a forked repo of [ghost-chat](https://github.com/Enubia/ghost-chat). This version added support for merging multiple chats, so collaborations between streamers only need to capture 1 chat. The original readme can be found in the original repo.

## Installation / Usage

- Download the latest release (installer or standalone) from [https://github.com/lucas861223/ghost-chat/releases](https://github.com/lucas861223/ghost-chat/releases).
- Right clicking on chat can bring up context menu for settings.
- To exit clickthrough mode, right click the icon from system tray and choose revert click-through.

## With regard to window capturing frameless mode still has opaque background in OBS

Something about using GPU or about windows make OBS not able to capture the transparency of the window. You would need to use browser source or other types of capture if you want to capture chat with transparent background. My knowledge on those is limited, and don't really know how to solve this problem, so it will have to be done differently. Here is something you can do instead:

Exit ghost mode. Set the background to white (#ffffff) or black (#000000), then set font color to the opposite (note that if you set the background to white it'd be hard to navigate the menu, though with highlighting and hovering it should be doable), then capture the window in OBS. 

<p float="left">
  <img src="https://i.imgur.com/XOOliRD.png" width="400" />
  <img src="https://i.imgur.com/JIz4tlX.png" width="400" /> 
</p>


Right click on the source, open filter, add a chromakey filter. Choose the color of the background and set similarity to 1. Smoothless is up to personal preference. Apply the filter, then chat should be transparent.

<p float="left">
  <img src="https://i.imgur.com/rIIh2pX.png" width="400" />
  <img src="https://i.imgur.com/ESM3ZkV.png" width="400" /> 
</p>
