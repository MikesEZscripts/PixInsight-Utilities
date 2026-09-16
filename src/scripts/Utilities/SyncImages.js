#engine v8

#feature-id    Utilities > SyncImages
#feature-info  Synchronizes zoom and viewport position across open images.


/*
 * HDR Sync Experiment
 *
 * Tests whether PixInsight 1.9.4 allows us to copy:
 *
 *    zoomFactor
 *    viewportPosition
 *
 * between ImageWindow objects.
 *
 * Open your six HDR outputs first.
 */

function main()
{
   Console.show();

   var sourceWindow = ImageWindow.activeWindow;

   if ( sourceWindow.isNull )
      throw new Error( "No active image window." );

   /*
    * Use every currently open image except the source.
    * For this first experiment, close unrelated images or
    * leave only the HDR comparison images visible.
    */

   var windows = ImageWindow.windows;

   Console.writeln( "" );
   Console.writeln( "========================================" );
   Console.writeln( "HDR Sync Experiment" );
   Console.writeln( "========================================" );

   Console.writeln(
      "Source window: " +
      sourceWindow.mainView.id
   );

   Console.writeln(
      "Source zoomFactor: " +
      sourceWindow.zoomFactor
   );

   Console.writeln(
      "Source viewportPosition: " +
      sourceWindow.viewportPosition.x +
      ", " +
      sourceWindow.viewportPosition.y
   );

   for ( var i = 0; i < windows.length; ++i )
   {
      var w = windows[i];

      if ( w.isNull )
         continue;

      if ( w.mainView.id == sourceWindow.mainView.id )
         continue;

      Console.writeln(
         "Synchronizing: " +
         w.mainView.id
      );

      /*
       * Copy zoom.
       */

      w.zoomFactor =
         sourceWindow.zoomFactor;

      /*
       * Copy viewport position.
       */

      w.viewportPosition =
         new Point(
            sourceWindow.viewportPosition.x,
            sourceWindow.viewportPosition.y
         );

      w.updateViewport();
   }

   Console.writeln( "" );
   Console.writeln(
      "One-time synchronization complete."
   );
}

main();
