/*
 * ResizeForDiscord.js
 *
 * PixInsight 1.9.4
 *
 * Drag the process icon onto an image.
 *
 * The script:
 *   1. Copies the target image.
 *   2. Saves test PNG files.
 *   3. Measures their actual file size.
 *   4. Searches for the largest dimensions that remain
 *      below the requested PNG file-size limit.
 *   5. Leaves the final resized image open in PixInsight.
 *
 * The original image is never modified.
 */

#feature-id    Utilities > SaveAs10Mb
#feature-info  Resize an image for a target PNG file size.

#define VERSION "1.0"

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------

var DEFAULT_TARGET_MB = 9.75;

// Leave a little breathing room below the requested size.
// 0.98 means we actually aim for 98% of TargetMB.
var SAFETY_FACTOR = 1.0;

// Number of resize/test iterations.
var MAX_ITERATIONS = 12;

// Stop when we're within this many MB of the desired size.
var SIZE_TOLERANCE_MB = 0.25;


// ------------------------------------------------------------
// PARAMETERS
// ------------------------------------------------------------

function ScriptParameters()
{
   this.targetMB = DEFAULT_TARGET_MB;

   this.importParameters = function()
   {
      if ( Parameters.has( "targetMB" ) )
         this.targetMB = Parameters.getReal( "targetMB" );
   };

   this.exportParameters = function()
   {
      Parameters.set( "targetMB", this.targetMB );
   };
}

var P = new ScriptParameters;


// ------------------------------------------------------------
// GET FILE SIZE
// ------------------------------------------------------------

function fileSizeBytes( filePath )
{
   var f = new File;

   try
   {
      f.openForReading( filePath );
      var size = f.size;
      f.close();

      return size;
   }
   catch ( e )
   {
      try
      {
         f.close();
      }
      catch ( e2 )
      {
      }

      throw new Error(
         "Unable to determine temporary PNG file size:\n\n" +
         filePath + "\n\n" + e
      );
   }
}


// ------------------------------------------------------------
// SAVE PNG
// ------------------------------------------------------------

function savePNG( window, filePath )
{
   if ( File.exists( filePath ) )
      File.remove( filePath );

   /*
    * saveAs()
    *
    * The .png extension tells PixInsight which file format
    * should be used.
    */

   if ( !window.saveAs(
      filePath,
      false,  // queryOptions
      false,  // allowMessages
      false,  // strict
      false   // verifyOverwrite
   ) )
   {
      throw new Error(
         "PixInsight was unable to save temporary PNG:\n\n" +
         filePath
      );
   }

   return fileSizeBytes( filePath );
}


// ------------------------------------------------------------
// CREATE RESIZED COPY
// ------------------------------------------------------------

function makeResizedCopy( sourceView, width, height, id )
{
   var sourceImage = sourceView.image;

   var w = new ImageWindow(
      sourceImage.width,
      sourceImage.height,
      sourceImage.numberOfChannels,
      sourceImage.bitsPerSample,
      sourceImage.isReal,
      sourceImage.isColor,
      id
   );

   w.mainView.beginProcess();

   w.mainView.image.assign( sourceImage );

   w.mainView.endProcess();

   var R = new Resample;

   R.xSize = width / sourceImage.width;
   R.ySize = height / sourceImage.height;

   R.mode = Resample.prototype.RelativeDimensions;

   R.absoluteMode =
      Resample.prototype.ForceWidthAndHeight;

   R.interpolation =
      Resample.prototype.Lanczos3;

   R.clampingThreshold = 0.30;
   R.smoothness = 1.50;

   R.executeOn( w.mainView );

   return w;
}


// ------------------------------------------------------------
// SAFE IMAGE ID
// ------------------------------------------------------------

function makeUniqueId( base )
{
   var id = base;

   var n = 1;

   while ( !View.viewById( id ).isNull )
   {
      id = base + "_" + n;
      ++n;
   }

   return id;
}


// ------------------------------------------------------------
// TEMP FILE
// ------------------------------------------------------------

function temporaryPNGPath()
{
   var dir = File.systemTempDirectory;

   if ( !dir.endsWith( "/" ) )
      dir += "/";

   return dir +
      "PixInsight_DiscordResize_" +
      Math.round( 1000000*Math.random() ) +
      ".png";
}


// ------------------------------------------------------------
// MAIN PROCESSING
// ------------------------------------------------------------

function processImage( view )
{
   if ( view == null || view.isNull )
      throw new Error( "No target image was supplied." );

   var image = view.image;

   var originalWidth  = image.width;
   var originalHeight = image.height;

   var requestedBytes =
      P.targetMB * 1024 * 1024;

   var targetBytes =
      requestedBytes * SAFETY_FACTOR;

   console.show();

   console.writeln();
   console.writeln(
      "<end><cbr><br><b>Resize for Discord</b>"
   );

   console.writeln(
      "Target PNG size: " +
      P.targetMB.toFixed( 2 ) +
      " MB"
   );

   console.writeln(
      "Working target: " +
      ( targetBytes / 1024 / 1024 ).toFixed( 2 ) +
      " MB"
   );

   console.writeln(
      "Original dimensions: " +
      originalWidth +
      " x " +
      originalHeight
   );

   var tempPath = temporaryPNGPath();

   var testWindow = null;

   var bestWidth  = 0;
   var bestHeight = 0;
   var bestBytes  = 0;

   try
   {
      // ------------------------------------------------------
      // First determine how large the original image PNG is.
      // ------------------------------------------------------

      var originalCopy =
         makeResizedCopy(
            view,
            originalWidth,
            originalHeight,
            "__DiscordTest"
         );

      var originalBytes =
         savePNG( originalCopy, tempPath );

      originalCopy.forceClose();

      console.writeln(
         "Original PNG size: " +
         ( originalBytes / 1024 / 1024 ).toFixed( 2 ) +
         " MB"
      );


      // ------------------------------------------------------
      // If it's already below the target, no resizing needed.
      // ------------------------------------------------------

      if ( originalBytes <= targetBytes )
      {
         bestWidth  = originalWidth;
         bestHeight = originalHeight;
         bestBytes  = originalBytes;
      }
      else
      {
         /*
          * File size approximately follows pixel area.
          *
          * This gives us a very good initial guess:
          *
          * scale = sqrt(target/original)
          */

         var initialScale =
            Math.sqrt(
               targetBytes / originalBytes
            );

         var lowScale  = 0.05;
         var highScale = 1.0;

         var scale = initialScale;

         for ( var iteration = 0;
               iteration < MAX_ITERATIONS;
               ++iteration )
         {
            var newWidth =
               Math.max(
                  1,
                  Math.round(
                     originalWidth * scale
                  )
               );

            var newHeight =
               Math.max(
                  1,
                  Math.round(
                     originalHeight * scale
                  )
               );

            console.writeln();
            console.writeln(
               "Test " +
               ( iteration + 1 ) +
               ": " +
               newWidth +
               " x " +
               newHeight
            );

            testWindow =
               makeResizedCopy(
                  view,
                  newWidth,
                  newHeight,
                  "__DiscordTest"
               );

            var bytes =
               savePNG(
                  testWindow,
                  tempPath
               );

            testWindow.forceClose();
            testWindow = null;

            var mb =
               bytes / 1024 / 1024;

            console.writeln(
               "PNG size: " +
               mb.toFixed( 3 ) +
               " MB"
            );


            // ------------------------------------------------
            // Valid candidate
            // ------------------------------------------------

            if ( bytes <= targetBytes )
            {
               if ( bytes > bestBytes )
               {
                  bestBytes  = bytes;
                  bestWidth  = newWidth;
                  bestHeight = newHeight;
               }

               lowScale = scale;
            }
            else
            {
               highScale = scale;
            }


            // ------------------------------------------------
            // Close enough?
            // ------------------------------------------------

            var differenceMB =
               Math.abs(
                  targetBytes - bytes
               ) /
               1024 /
               1024;

            if ( bytes <= targetBytes &&
                 differenceMB <= SIZE_TOLERANCE_MB )
            {
               break;
            }


            // Binary-search next scale.
            scale =
               ( lowScale + highScale ) / 2;
         }
      }


      // ------------------------------------------------------
      // CREATE FINAL IMAGE
      // ------------------------------------------------------

      if ( bestWidth <= 0 ||
           bestHeight <= 0 )
      {
         throw new Error(
            "Unable to determine suitable image dimensions."
         );
      }

      var finalId =
         makeUniqueId(
            view.id + "_10Mb"
         );

      var finalWindow =
         makeResizedCopy(
            view,
            bestWidth,
            bestHeight,
            finalId
         );

      finalWindow.show();
      finalWindow.zoomToFit();


      // ------------------------------------------------------
      // RESULTS
      // ------------------------------------------------------

      console.writeln();
      console.writeln(
         "<b>Finished</b>"
      );

      console.writeln(
         "Final dimensions: " +
         bestWidth +
         " x " +
         bestHeight
      );

      console.writeln(
         "Estimated PNG size: " +
         ( bestBytes / 1024 / 1024 ).toFixed( 3 ) +
         " MB"
      );

      console.writeln(
         "Output view: " +
         finalId
      );

      console.writeln();
      console.writeln(
         "Save the resulting view as PNG."
      );
   }
   finally
   {
      if ( testWindow != null )
      {
         try
         {
            testWindow.forceClose();
         }
         catch ( e )
         {
         }
      }

      if ( File.exists( tempPath ) )
      {
         try
         {
            File.remove( tempPath );
         }
         catch ( e )
         {
         }
      }
   }
}


// ------------------------------------------------------------
// ENTRY POINT
// ------------------------------------------------------------

function main()
{
   P.importParameters();

   if ( Parameters.isViewTarget )
   {
      processImage(
         Parameters.targetView
      );

      return;
   }

   /*
    * Running from Script > Feature Scripts uses the
    * currently active image.
    */

   var w = ImageWindow.activeWindow;

   if ( w.isNull )
   {
      new MessageBox(
         "There is no active image.",
         "Resize for Discord",
         StdIcon_Error,
         StdButton_Ok
      ).execute();

      return;
   }

   processImage( w.currentView );
}

main();
