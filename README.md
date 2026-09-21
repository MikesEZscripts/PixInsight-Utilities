# PixInsight Utilities

Quality-of-life utility scripts for PixInsight, collected in a single **Script > Utilities** menu.

## NOTE

These utilities are designed to be run as **click-and-drag process icons** in your workspace. To create a process icon, locate the utility in the **Process Explorer**, then click and drag it to your workspace. You can rename the icon and save your workspace process icons for future use.

A ready-made process icon set is also included in this repository as `MikesEZScripts-ProcessIcons.xpsm`.

## Included utilities

* **BatchHDR** — Creates six HDR comparison variants of the active image. (Automates CreateHDR by Jürgen Terpe)
* **CreateHDRImageIcon** — Process-icon-enabled version of CreateHDR. (Launches CreateHDR by Jürgen Terpe)
* **QuickMagentaCorrect** — Inverts the image, applies SCNR Green, then inverts back.
* **ResizeWindow** — Resizes an image window using Width and Height process parameters (default is 800x800).
* **SaveAs10Mb** — Creates a resized copy targeted below the 10 MB PNG upload limit.
* **SaveAs20Mb** — Creates a resized copy targeted below the 20 MB PNG upload limit.
* **SyncImages** — Copies the active image's zoom and viewport position to the other open image windows.
* **ViewIntegration** — Integrates currently open PixInsight views through the native ImageIntegration process.

## Compatibility

These utilities were developed and tested with **PixInsight 1.9.5**.

## HDR dependency

**CreateHDRImageIcon** and **BatchHDR** use Jürgen Terpe's **CreateHDR** script. Please add it to your repository:
**https://www.ideviceapps.de/PixInsight/Utilities/**

## Installation through PixInsight

Add this repository URL to PixInsight's update repositories:

`https://raw.githubusercontent.com/MikesEZscripts/PixInsight-Utilities/main/`

Then run **Resources > Updates > Check for Updates** and restart PixInsight when prompted.

The installed scripts appear under **Script > Utilities**.

## Process icons

The repository includes `MikesEZScripts-ProcessIcons.xpsm`, containing ready-made process icons for all eight utilities. The icons reference the standard PixInsight installation path under `src/scripts/Utilities`.

## Credits

The HDR utilities in this repository are based on **CreateHDR by Jürgen Terpe**. Jürgen's original work provided the foundation for the CreateHDRImageIcon and BatchHDR utilities included here.

Special thanks to Jürgen for his work on CreateHDR and for his support and enthusiasm for these automation icons. His original copyright and attribution remain in the CreateHDR source and interface.

## Notes

These scripts are small workflow and quality-of-life utilities rather than replacements for PixInsight's native image-processing tools. Some utilities support PixInsight Script process instances/process icons so their settings can be saved and reused.
