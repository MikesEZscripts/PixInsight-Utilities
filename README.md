# PixInsight Utilities

Quality-of-life utility scripts for PixInsight, collected in a single **Script > Utilities** menu.

## NOTE
These utlities are designed to be run as click and drag process icons in your workspace.
To run these utilities search for them in the process explorer, click and drag them to your workspace, save the name, and save your process icons file.

## Included utilities

- **BatchHDR** — Creates six HDR comparison variants of the active image. (createHDR process by Jürgen Terpe)
- **CreateHDRImage** — Process-icon-enabled version of CreateHDR. (createHDR process by Jürgen Terpe)
- **QuickMagentaCorrect** — Inverts the image, applies SCNR Green, then inverts back.
- **ResizeWindow** — Resizes an image window using Width and Height process parameters.
- **SaveAs10Mb** — Creates a resized copy targeted below the 10 MB PNG upload limit.
- **SaveAs20Mb** — Creates a resized copy targeted below the 20 MB PNG upload limit.
- **SyncImages** — Copies the active image's zoom and viewport position to the other open image windows.
- **ViewIntegration** — Integrates currently open PixInsight views through the native ImageIntegration process.

## Compatibility

These utilities were developed and tested with **PixInsight 1.9.4 Lockhart**.

## HDR dependency

**BatchHDR** and **CreateHDRImage** use Jürgen Terpe's `PixInsightToolsPreviewControl.jsh`. Install Jürgen's Toolbox scripts as well so PixInsight has `src/scripts/Toolbox/PixInsightToolsPreviewControl.jsh`.

## Installation through PixInsight

Add this repository URL to PixInsight's update repositories:

`https://raw.githubusercontent.com/MikesEZscripts/PixInsight-Utilities/main/`

Then run **Resources > Updates > Check for Updates** and restart PixInsight when prompted.

The installed scripts appear under **Script > Utilities**.

## Credits

The HDR utilities in this repository are based on **CreateHDR by Jürgen Terpe**. Jürgen's original work provided the foundation for the CreateHDRImage and BatchHDR utilities included here.

Special thanks to Jürgen for his work on CreateHDR and for his support and enthusiasm for these modifications and extensions. His original copyright and attribution remain in the CreateHDR source and interface.

## Notes

These scripts are small workflow and quality-of-life utilities rather than replacements for PixInsight's native image-processing tools. Some utilities support PixInsight Script process instances/process icons so their settings can be saved and reused.
