/*
 * ============================================================
 * QuickMagentaCorrect.js
 *
 * PixInsight 1.9.4 Lockhart
 *
 * Inverts the active image, applies SCNR to Green,
 * then inverts the image back.
 *
 * SCNR settings:
 *   Color to remove : Green
 *   Amount          : 0.8
 *   Preserve Lightness : true
 *
 * ============================================================
 */

#feature-id    Utilities > QuickMagentaCorrect
#feature-info  Invert -> SCNR Green -> Invert


function invertImage( view )
{
   var PM = new PixelMath;

   PM.expression = "1 - $T";

   // Replace the current image.
   PM.createNewImage = false;

   // Don't alter the image's geometry.
   PM.rescale = false;

   // No channel replacement expressions.
   PM.useSingleExpression = true;

   PM.executeOn( view );
}


function applySCNR( view )
{
   var SCNRProcess = new SCNR;

   // Remove green.
   SCNRProcess.colorToRemove = SCNR.prototype.Green;

   // 80% amount.
   SCNRProcess.amount = 0.8;

   // Preserve luminance.
   SCNRProcess.preserveLightness = true;

   SCNRProcess.executeOn( view );
}


function main()
{
   var window = ImageWindow.activeWindow;

   if ( window.isNull )
      throw new Error( "QuickMagentaCorrect: No active image." );

   var view = window.mainView;

   if ( view.isNull )
      throw new Error( "QuickMagentaCorrect: No main view." );

   Console.writeln( "" );
   Console.writeln( "QuickMagentaCorrect" );
   Console.writeln( "-------------------" );

   Console.writeln( "1/3  Inverting image..." );
   invertImage( view );

   Console.writeln( "2/3  Applying SCNR Green..." );
   applySCNR( view );

   Console.writeln( "3/3  Inverting image back..." );
   invertImage( view );

   Console.writeln( "QuickMagentaCorrect complete." );
   Console.writeln( "" );
}


main();
