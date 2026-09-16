#engine v8

#feature-id    Utilities > BatchHDR
#feature-info  Creates six HDR comparison variants from the active image.


#include "../Toolbox/PixInsightToolsPreviewControl.jsh"
#include <pjsr/SampleType.jsh>
#include <pjsr/DataType.jsh>

CoreApplication.ensureMinimumVersion( 1, 9, 4 );


/*
 *
 * CreateHDRImageBatch.js
 *
 * HDR workflow based on CreateHDR by Jürgen Terpe.
 * Batch utility by Mike Cleary.
 *
 * Creates six HDR versions of the active image:
 *
 * Row 1:
 *   HDR4  - 4 layers,  blend 0.4
 *   HDR6  - 6 layers,  blend 0.4
 *   HDR9  - 9 layers,  blend 0.4
 *
 * Row 2:
 *   HDR4  - 4 layers,  blend 0.8
 *   HDR6  - 6 layers,  blend 0.8
 *   HDR9  - 9 layers,  blend 0.8
 *
 * The original image is never modified.
 *
 * Display:
 *   Images are displayed approximately 400 pixels wide
 *   and arranged 3 across by 2 rows.
 *
 */


// -----------------------------------------------------------------------------
// USER SETTINGS
// -----------------------------------------------------------------------------

var batchParameters =
{
   hdrLayers: [ 4, 6, 9 ],

   blend04: 0.4,
   blend08: 0.8,

   scalingFunction: "B3 Spline (5)",

   colorIntensity: 0.85,

   toIntensity: false,

   useMedianTransform: false,

   luminance: 0.0,
   saturation: 0.0,
   contrast: 0.0,

   maskSmoothness: 10.0,

   mask: undefined
};


// -----------------------------------------------------------------------------
// PIXELMATH HELPER
// -----------------------------------------------------------------------------

function runPixelMath( targetView, expression, newId, colorSpace )
{
   var P = new PixelMath;

   P.expression = expression;
   P.expression1 = "";
   P.expression2 = "";
   P.expression3 = "";

   P.useSingleExpression = true;

   P.symbols = "";

   P.clearImageCacheAndExit = false;
   P.cacheGeneratedImages = false;

   P.generateOutput = true;
   P.singleThreaded = false;
   P.optimization = true;

   P.use64BitWorkingImage = false;

   P.rescale = false;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;

   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;

   P.createNewImage = true;
   P.showNewImage = true;

   P.newImageId = newId;

   P.newImageWidth = targetView.image.width;
   P.newImageHeight = targetView.image.height;

   P.newImageAlpha = false;

   if ( colorSpace === undefined )
      P.newImageColorSpace = PixelMath.SameAsTarget;
   else
      P.newImageColorSpace = colorSpace;

   P.newImageSampleFormat = PixelMath.SameAsTarget;

   P.executeOn( targetView, true );

   var w = ImageWindow.windowById( newId );

   if ( w.isNull )
      throw new Error(
         "PixelMath failed to create image: " + newId
      );

   return w.mainView;
}


// -----------------------------------------------------------------------------
// CLONE IMAGE
// -----------------------------------------------------------------------------

function clone( view, id )
{
   Console.writeln(
      "Cloning " + view.id + " -> " + id
   );

   return runPixelMath(
      view,
      "$T",
      id,
      PixelMath.SameAsTarget
);
}


// -----------------------------------------------------------------------------
// HDR MULTISCALE TRANSFORM
// -----------------------------------------------------------------------------

function createHDR( view, numLayers )
{
   Console.writeln(
      "Applying HDRMultiscaleTransform: " +
      numLayers +
      " layers"
   );

   var P = new HDRMultiscaleTransform;

   P.numberOfLayers = numLayers;

   P.numberOfIterations = 1;

   P.invertedIterations = true;

   P.overdrive = 0.000;

   P.medianTransform =
      batchParameters.useMedianTransform;

   // --------------------------------------------------------------------------
   // Scaling functions
   // --------------------------------------------------------------------------

   if ( batchParameters.scalingFunction ==
        "Linear Interpolation (3)" )
   {
      P.scalingFunctionData =
      [
         0.292893, 0.5,      0.292893,
         0.5,      1.0,      0.5,
         0.292893, 0.5,      0.292893
      ];

      P.scalingFunctionRowFilter =
      [
         0.292893, 0.5, 0.292893
      ];

      P.scalingFunctionColFilter =
      [
         0.292893, 0.5, 0.292893
      ];

      P.scalingFunctionName =
         "Linear Interpolation (3)";
   }
   else if ( batchParameters.scalingFunction ==
             "B3 Spline (5)" )
   {
      P.scalingFunctionData =
      [
         0.003906,0.015625,0.023438,0.015625,0.003906,
         0.015625,0.062500,0.093750,0.062500,0.015625,
         0.023438,0.093750,0.140625,0.093750,0.023438,
         0.015625,0.062500,0.093750,0.062500,0.015625,
         0.003906,0.015625,0.023438,0.015625,0.003906
      ];

      P.scalingFunctionRowFilter =
      [
         0.0625, 0.25, 0.375, 0.25, 0.0625
      ];

      P.scalingFunctionColFilter =
      [
         0.0625, 0.25, 0.375, 0.25, 0.0625
      ];

      P.scalingFunctionName =
         "B3 Spline (5)";
   }
   else if ( batchParameters.scalingFunction ==
             "Gaussian (9)" )
   {
      P.scalingFunctionData =
      [
         0.003162,0.023714,0.100000,0.237137,0.316228,
         0.023714,0.177828,0.749894,1.778279,2.371374,
         0.100000,0.749894,3.162278,7.498942,10.000000,
         0.237137,1.778279,7.498942,17.782794,23.713737,
         0.003162,0.023714,0.100000,0.237137,0.316228
      ];

      P.scalingFunctionRowFilter =
      [
         0.003162,
         0.023714,
         0.1,
         0.237137,
         0.316228,
         0.237137,
         0.1,
         0.023714,
         0.003162
      ];

      P.scalingFunctionColFilter =
      [
         0.003162,
         0.023714,
         0.1,
         0.237137,
         0.316228,
         0.237137,
         0.1,
         0.023714,
         0.003162
      ];

      P.scalingFunctionName =
         "Gaussian (9)";
   }
   else
   {
      // Default to B3 Spline (5)

      P.scalingFunctionData =
      [
         0.003906,0.015625,0.023438,0.015625,0.003906,
         0.015625,0.062500,0.093750,0.062500,0.015625,
         0.023438,0.093750,0.140625,0.093750,0.023438,
         0.015625,0.062500,0.093750,0.062500,0.015625,
         0.003906,0.015625,0.023438,0.015625,0.003906
      ];

      P.scalingFunctionRowFilter =
      [
         0.0625, 0.25, 0.375, 0.25, 0.0625
      ];

      P.scalingFunctionColFilter =
      [
         0.0625, 0.25, 0.375, 0.25, 0.0625
      ];

      P.scalingFunctionName =
         "B3 Spline (5)";
   }

   // --------------------------------------------------------------------------
   // HDR parameters
   // --------------------------------------------------------------------------

   P.deringing = false;

   P.smallScaleDeringing = 0.000;

   P.largeScaleDeringing = 0.250;

   P.outputDeringingMaps = false;

   P.midtonesBalanceMode =
      HDRMultiscaleTransform.Automatic;

   P.midtonesBalance = 0.500000;

   P.toLightness = true;

   P.preserveHue =
      !batchParameters.toIntensity;

   P.toIntensity =
      batchParameters.toIntensity;

   P.luminanceMask = true;

   P.executeOn( view, true );
}


// -----------------------------------------------------------------------------
// BLUR MASK
// -----------------------------------------------------------------------------

function blurMask( view )
{
   if ( batchParameters.maskSmoothness <= 0 )
      return;

   Console.writeln(
      "Blurring mask: " +
      batchParameters.maskSmoothness
   );

   var expression =
      "gconv($T," +
      batchParameters.maskSmoothness +
      ")";

   var P = new PixelMath;

   P.expression = expression;

   P.expression1 = "";
   P.expression2 = "";
   P.expression3 = "";

   P.useSingleExpression = true;

   P.symbols = "";

   P.clearImageCacheAndExit = false;
   P.cacheGeneratedImages = false;

   P.generateOutput = true;
   P.singleThreaded = false;
   P.optimization = true;

   P.use64BitWorkingImage = false;

   P.rescale = false;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;

   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;

   P.createNewImage = false;

   P.executeOn( view, true );
}


// -----------------------------------------------------------------------------
// CREATE LUMINANCE MASK
// -----------------------------------------------------------------------------

function createLuminanceMask( view, id )
{
   Console.writeln(
      "Creating luminance mask: " + id
   );

   return runPixelMath(
      view,
      "CIEL($T)",
      id,
      ColorSpace_Gray
   );
}


// -----------------------------------------------------------------------------
// APPLY CURVES
// -----------------------------------------------------------------------------

function applyCurves( view )
{
   if ( batchParameters.luminance == 0 &&
        batchParameters.saturation == 0 &&
        batchParameters.contrast == 0 )
      return;

   var P = new CurvesTransformation;

   /*
    * Identity RGBK curve.
    */

   P.RGBK =
   [
      [ 0, 0 ],
      [ 1, 1 ]
   ];

   /*
    * Luminance / contrast adjustment.
    *
    * These settings are normally zero in this batch script.
    */

   if ( batchParameters.contrast != 0 )
   {
      var c = batchParameters.contrast;

      var y1 = 0.5 - c * 0.5;
      var y2 = 0.5 + c * 0.5;

      P.RGBK =
      [
         [ 0, 0 ],
         [ 0.5, y1 ],
         [ 1, y2 ]
      ];
   }

   P.executeOn( view, true );
}


// -----------------------------------------------------------------------------
// BLEND HDR IMAGE WITH ORIGINAL
// -----------------------------------------------------------------------------

function blendViews(
   hdrView,
   originalView,
   hdrAmount,
   id
)
{
   Console.writeln(
      "Blending " +
      hdrView.id +
      " with " +
      originalView.id +
      " at " +
      hdrAmount
   );

   var expression =
      hdrAmount.toString() +
      "*" +
      hdrView.id +
      "+" +
      (1 - hdrAmount).toString() +
      "*" +
      originalView.id;

      return runPixelMath(
         originalView,
         expression,
         id,
         PixelMath.SameAsTarget
      );
}


// -----------------------------------------------------------------------------
// PROCESS ONE HDR RESULT
// -----------------------------------------------------------------------------

function processHDR(
   sourceView,
   layers,
   blendAmount,
   suffix
)
{
   Console.writeln("");
   Console.writeln(
      "================================================"
   );
   Console.writeln(
      "Processing HDR " +
      layers +
      " / blend " +
      blendAmount
   );
   Console.writeln(
      "================================================"
   );

   var baseId =
      sourceView.id +
      "_HDR_layer" +
      layers +
      suffix;

   var cloneId =
      baseId +
      "_clone";

   // --------------------------------------------------------------------------
   // Clone original
   // --------------------------------------------------------------------------

   var cloneView =
      clone(
         sourceView,
         cloneId
      );

   // --------------------------------------------------------------------------
   // Optional mask
   // --------------------------------------------------------------------------

   var maskView = null;

   if ( batchParameters.mask != undefined &&
        !batchParameters.mask.isNull )
   {
      maskView = batchParameters.mask;

      Console.writeln(
         "Applying mask: " +
         maskView.id
      );

      cloneView.window.setMask(
         maskView
      );

      cloneView.window.maskEnabled = true;
   }

   // --------------------------------------------------------------------------
   // HDR
   // --------------------------------------------------------------------------

   createHDR(
      cloneView,
      layers
   );

   // --------------------------------------------------------------------------
   // Curves
   // --------------------------------------------------------------------------

   applyCurves(
      cloneView
   );

   // --------------------------------------------------------------------------
   // Remove mask
   // --------------------------------------------------------------------------

   if ( maskView != null &&
        !maskView.isNull )
   {
      cloneView.window.maskEnabled = false;
      cloneView.window.removeMask();
   }

   // --------------------------------------------------------------------------
   // Blend HDR result with original
   // --------------------------------------------------------------------------

   var combinedView =
      blendViews(
         cloneView,
         sourceView,
         blendAmount,
         baseId
      );

   // --------------------------------------------------------------------------
   // Copy metadata
   // --------------------------------------------------------------------------

   try
   {
      combinedView.window.keywords =
         sourceView.window.keywords;
   }
   catch ( e )
   {
      Console.writeln(
         "Warning: unable to copy keywords."
      );
   }

   try
   {
      if ( sourceView.window.hasAstrometricSolution )
         combinedView.window.copyAstrometricSolution(
            sourceView.window
         );
   }
   catch ( e )
   {
      Console.writeln(
         "Warning: unable to copy astrometric solution."
      );
   }

   // --------------------------------------------------------------------------
   // Show result
   // --------------------------------------------------------------------------

   combinedView.window.show();

   // Do NOT call zoomToOptimalFit() here.
   //
   // The final layout routine controls the display size.
   //

   // --------------------------------------------------------------------------
   // Close temporary clone
   // --------------------------------------------------------------------------

   try
   {
      cloneView.window.forceClose();
   }
   catch ( e )
   {
      Console.writeln(
         "Warning: unable to close temporary clone."
      );
   }

   Console.writeln(
      "Created: " +
      combinedView.id
   );

   return combinedView;
}


// -----------------------------------------------------------------------------
// ARRANGE SIX RESULT WINDOWS
// -----------------------------------------------------------------------------

function arrangeResults(
   results04,
   results08
)
{
   Console.writeln("");
   Console.writeln(
      "================================================"
   );
   Console.writeln(
      "Arranging HDR results in 3 x 2 layout"
   );
   Console.writeln(
      "================================================"
   );

   /*
    * Desired displayed IMAGE width.
    *
    * This is the actual image display width, not merely
    * the size of the ImageWindow.
    */

   var imageWidth = 50;

   /*
    * Window dimensions.
    *
    * These are deliberately slightly larger than the
    * displayed image so the entire image can be seen
    * without immediately needing scrollbars.
    */

   var windowWidth = 600;
   var windowHeight = 600;

   var gap = 10;

   var startX = 20;
   var startY = 50;


function placeWindow( view, x, y )
{
   if ( view == null ||
        view.isNull )
      return;

   var window = view.window;

   if ( window == null ||
        window.isNull )
      return;

   window.show();

   /*
    * Fixed comparison window size and position.
    */

   window.geometry =
      new Rect(
         x,
         y,
         x + windowWidth,
         y + windowHeight
      );

   /*
    * Keep the zoom level that worked well.
    */

   window.zoomFactor = -3;

   window.updateViewport();

   /*
    * Center the viewport on the center
    * of the image.
    */

   var cx = view.image.width / 2;
   var cy = view.image.height / 2;

   window.setViewport(
      new Point( cx, cy )
   );

   window.updateViewport();

   Console.writeln(
      "Placed " +
      view.id +
      " centered at image center (" +
      cx +
      "," +
      cy +
      "), zoom = " +
      window.zoomFactor
   );
}


   // --------------------------------------------------------------------------
   // TOP ROW - BLEND 0.4
   // --------------------------------------------------------------------------

   var y1 = startY;

   placeWindow(
      results04[0],
      startX,
      y1
   );

   placeWindow(
      results04[1],
      startX +
      windowWidth +
      gap,
      y1
   );

   placeWindow(
      results04[2],
      startX +
      2 *
      (windowWidth + gap),
      y1
   );


   // --------------------------------------------------------------------------
   // BOTTOM ROW - BLEND 0.8
   // --------------------------------------------------------------------------

   var y2 =
      startY +
      windowHeight +
      gap;

   placeWindow(
      results08[0],
      startX,
      y2
   );

   placeWindow(
      results08[1],
      startX +
      windowWidth +
      gap,
      y2
   );

   placeWindow(
      results08[2],
      startX +
      2 *
      (windowWidth + gap),
      y2
   );


   /*
    * Put the first result on top so that the windows remain
    * easy to interact with while retaining their positions.
    */

   if ( results04.length > 0 &&
        results04[0] != null &&
        !results04[0].isNull )
   {
      results04[0].window.bringToFront();
   }


   Console.writeln(
      "HDR comparison layout complete."
   );

   Console.writeln(
      "Displayed image width: " +
      imageWidth +
      " pixels"
   );
}


// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

function main()
{
   Console.show();

   Console.writeln("");
   Console.writeln(
      "================================================"
   );
   Console.writeln(
      "CreateHDRImageBatch"
   );
   Console.writeln( "Based on CreateHDR by Jürgen Terpe" );
   Console.writeln( "Batch utility by Mike Cleary" );
   Console.writeln(
      "================================================"
   );


   // --------------------------------------------------------------------------
   // Get active image
   // --------------------------------------------------------------------------

   var sourceWindow =
      ImageWindow.activeWindow;

   if ( sourceWindow.isNull )
      throw new Error(
         "No active image window."
      );


   var sourceView =
      sourceWindow.mainView;


   Console.writeln(
      "Source image: " +
      sourceView.id
   );


   // --------------------------------------------------------------------------
   // Create 0.4 blend row
   // --------------------------------------------------------------------------

   Console.writeln("");
   Console.writeln(
      "Creating BLEND 0.4 row..."
   );


   var results04 = [];


   results04.push(
      processHDR(
         sourceView,
         4,
         batchParameters.blend04,
         "_40percent"
      )
   );


   results04.push(
      processHDR(
         sourceView,
         6,
         batchParameters.blend04,
         "_40percent"
      )
   );


   results04.push(
      processHDR(
         sourceView,
         9,
         batchParameters.blend04,
         "_40percent"
      )
   );


   // --------------------------------------------------------------------------
   // Create 0.8 blend row
   // --------------------------------------------------------------------------

   Console.writeln("");
   Console.writeln(
      "Creating BLEND 0.8 row..."
   );


   var results08 = [];


   results08.push(
      processHDR(
         sourceView,
         4,
         batchParameters.blend08,
         "_80percent"
      )
   );


   results08.push(
      processHDR(
         sourceView,
         6,
         batchParameters.blend08,
         "_80percent"
      )
   );


   results08.push(
      processHDR(
         sourceView,
         9,
         batchParameters.blend08,
         "_80percent"
      )
   );


   // --------------------------------------------------------------------------
   // Arrange final images
   // --------------------------------------------------------------------------

   arrangeResults(
      results04,
      results08
   );


   // --------------------------------------------------------------------------
   // Synchronize Images
   // --------------------------------------------------------------------------


   // --------------------------------------------------------------------------
   // Done
   // --------------------------------------------------------------------------

   Console.writeln("");
   Console.writeln(
      "================================================"
   );
   Console.writeln(
      "CreateHDRImageBatch COMPLETE"
   );
   Console.writeln(
      "================================================"
   );

   Console.writeln("");
   Console.writeln(
      "Top row:    HDR4 / HDR6 / HDR9  -  Blend 0.4"
   );

   Console.writeln(
      "Bottom row: HDR4 / HDR6 / HDR9  -  Blend 0.8"
   );

   Console.writeln("");
}


// -----------------------------------------------------------------------------
// RUN
// -----------------------------------------------------------------------------

main();
