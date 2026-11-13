/*
 * SaveAs20Mb - 8-bit PNG size targeting (no probe)
 * PixInsight 1.9.5 / PJSR
 *
 * Each trial is a full-resolution-at-that-scale 8-bit PNG.
 * No reduced-resolution probe or extrapolation from a probe.
 * The source view is never modified.
 */
#script-id SaveAs20Mb
#feature-id Utilities > SaveAs20Mb
#feature-info Resize an image for an 8-bit PNG file-size limit.
#define VERSION "1.1"

var DEFAULT_TARGET_MB = 19.5;
var MAX_ITERATIONS = 12;
var SIZE_TOLERANCE_MB = 0.25;

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

function fileSizeBytes( path )
{
   var f = new File;
   try
   {
      f.openForReading( path );
      var n = f.size;
      f.close();
      return n;
   }
   catch ( e )
   {
      try { f.close(); } catch ( ignored ) {}
      throw new Error( "Cannot measure PNG: " + path + "\n" + e );
   }
}

function makeCopy( sourceView, width, height, id, bits, real )
{
   var src = sourceView.image;
   var w = new ImageWindow( src.width, src.height,
      src.numberOfChannels, bits, real, src.isColor, id );
   w.mainView.beginProcess();
   try
   {
      w.mainView.image.assign( src );
   }
   finally
   {
      w.mainView.endProcess();
   }

   if ( width != src.width || height != src.height )
   {
      var R = new Resample;
      R.xSize = width / src.width;
      R.ySize = height / src.height;
      R.mode = Resample.prototype.RelativeDimensions;
      R.absoluteMode = Resample.prototype.ForceWidthAndHeight;
      R.interpolation = Resample.prototype.Lanczos3;
      R.clampingThreshold = 0.30;
      R.smoothness = 1.50;
      R.executeOn( w.mainView );
   }
   return w;
}

function uniqueId( base )
{
   var id = base, i = 1;
   while ( !View.viewById( id ).isNull )
      id = base + "_" + i++;
   return id;
}

function tempPNGPath()
{
   var dir = File.systemTempDirectory;
   if ( !dir.endsWith( "/" ) ) dir += "/";
   return dir + "PixInsight_8bitPNG_" +
      Math.round( 100000000 * Math.random() ) + ".png";
}

function measure8BitPNG( sourceView, width, height, path )
{
   var resized = null, eightBit = null;
   try
   {
      // Resample at the original precision before quantizing.
      resized = makeCopy( sourceView, width, height,
         "__DiscordResizeTrial", sourceView.image.bitsPerSample,
         sourceView.image.isReal );

      eightBit = makeCopy( resized.mainView, width, height,
         "__Discord8BitTrial", 8, false );

      if ( File.exists( path ) ) File.remove( path );
      if ( !eightBit.saveAs( path, false, false, false, false ) )
         throw new Error( "Unable to save 8-bit test PNG: " + path );
      return fileSizeBytes( path );
   }
   finally
   {
      if ( eightBit != null ) eightBit.forceClose();
      if ( resized != null ) resized.forceClose();
   }
}

function processImage( view )
{
   if ( view == null || view.isNull )
      throw new Error( "No target image supplied." );
   if ( !isFinite( P.targetMB ) || P.targetMB <= 0 )
      throw new Error( "Target MB must be positive." );

   var W = view.image.width, H = view.image.height;
   var limit = P.targetMB * 1024 * 1024;
   var temp = tempPNGPath();
   var bestW = 0, bestH = 0, bestBytes = 0;

   console.show();
   console.writeln( "<end><cbr><br><b>8-bit PNG resize (no probe)</b>" );
   console.writeln( "Target: " + P.targetMB.toFixed( 2 ) +
      " MiB; original: " + W + " x " + H );

   try
   {
      var originalBytes = measure8BitPNG( view, W, H, temp );
      console.writeln( "Original 8-bit PNG: " +
         ( originalBytes / 1048576 ).toFixed( 3 ) + " MiB" );

      if ( originalBytes <= limit )
      {
         bestW = W; bestH = H; bestBytes = originalBytes;
         console.writeln( "Already under limit; preserving full resolution." );
      }
      else
      {
         var low = 0, high = 1;
         var scale = Math.min( 0.999,
            Math.sqrt( limit / originalBytes ) );

         for ( var i = 0; i < MAX_ITERATIONS; ++i )
         {
            var w = Math.max( 1, Math.min( W, Math.round( W * scale ) ) );
            var h = Math.max( 1, Math.min( H, Math.round( H * scale ) ) );
            var bytes = measure8BitPNG( view, w, h, temp );
            console.writeln( "Test " + ( i + 1 ) + ": " +
               w + " x " + h + " = " +
               ( bytes / 1048576 ).toFixed( 3 ) + " MiB" );

            if ( bytes <= limit )
            {
               if ( w * h > bestW * bestH )
               {
                  bestW = w; bestH = h; bestBytes = bytes;
               }
               low = scale;
               if ( ( limit - bytes ) / 1048576 <= SIZE_TOLERANCE_MB )
                  break;
            }
            else
               high = scale;

            // Use actual 8-bit file sizes; no separate probe.
            var predicted = scale * Math.sqrt( limit / bytes );
            var margin = 0.05 * ( high - low );
            scale = ( predicted > low + margin &&
                      predicted < high - margin )
                    ? predicted : ( low + high ) / 2;
            if ( Math.round( W * low ) >= Math.round( W * high ) &&
                 Math.round( H * low ) >= Math.round( H * high ) )
               break;
         }
      }

      if ( bestW < 1 || bestH < 1 )
         throw new Error( "Could not find dimensions below target." );

      var id = uniqueId( view.id + "_20Mb" );
      // Final output is an 8-bit image, matching measured trial PNGs.
      // This makes Save As PNG consistent with the trial bit depth.
      var resized = null, result = null;
      try
      {
         resized = makeCopy( view, bestW, bestH,
            "__DiscordFinalFloat", view.image.bitsPerSample,
            view.image.isReal );
         result = makeCopy( resized.mainView, bestW, bestH,
            id, 8, false );
      }
      finally
      {
         if ( resized != null ) resized.forceClose();
      }
      result.show();
      result.zoomToFit();

      console.writeln( "<b>Finished</b>: " + bestW + " x " +
         bestH + "; measured 8-bit PNG: " +
         ( bestBytes / 1048576 ).toFixed( 3 ) + " MiB" );
      console.writeln( "Save output view '" + id +
         "' as PNG (8-bit). Keep the original XISF master." );
      console.writeln( "Use matching PNG encoder options for comparable sizes." );
   }
   finally
   {
      if ( File.exists( temp ) )
         try { File.remove( temp ); } catch ( ignored ) {}
   }
}

function main()
{
   P.importParameters();
   if ( Parameters.isViewTarget )
   {
      processImage( Parameters.targetView );
      return;
   }
   var w = ImageWindow.activeWindow;
   if ( w.isNull )
   {
      new MessageBox( "There is no active image.",
         "SaveAs20Mb", StdIcon_Error, StdButton_Ok ).execute();
      return;
   }
   processImage( w.currentView );
}
main();