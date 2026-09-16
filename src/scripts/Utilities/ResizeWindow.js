#engine v8

#feature-id    Utilities > ResizeWindow
#feature-info  Resizes an image window using Width and Height process parameters.


CoreApplication.ensureMinimumVersion( 1, 9, 4 );

/*
 * Resize.js
 *
 * Drag the process icon onto an image to resize that
 * ImageWindow to the Width / Height stored in the
 * process icon parameters.
 */


// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

var DEFAULT_WIDTH  = 600;
var DEFAULT_HEIGHT = 600;


// -----------------------------------------------------------------------------
// GET PARAMETERS
// -----------------------------------------------------------------------------

function getWidth()
{
   if ( Parameters.has( "Width" ) )
      return Parameters.getInteger( "Width" );

   return DEFAULT_WIDTH;
}


function getHeight()
{
   if ( Parameters.has( "Height" ) )
      return Parameters.getInteger( "Height" );

   return DEFAULT_HEIGHT;
}


// -----------------------------------------------------------------------------
// RESIZE WINDOW
// -----------------------------------------------------------------------------

function resizeWindow( view )
{
   if ( view == null || view.isNull )
      return;

   var window = view.window;

   if ( window == null || window.isNull )
      return;

   var width  = getWidth();
   var height = getHeight();

   /*
    * Basic safety limits.
    */
   if ( width < 100 )
      width = 100;

   if ( height < 100 )
      height = 100;

   /*
    * Preserve current window position.
    */
   var g = window.geometry;

   var x = g.x0;
   var y = g.y0;

   /*
    * Resize window.
    */
   window.geometry =
      new Rect(
         x,
         y,
         x + width,
         y + height
      );

   window.updateViewport();

   Console.writeln(
      "Resized " +
      view.id +
      " to " +
      width +
      " x " +
      height
   );
}


// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

function main()
{
   /*
    * Process icon dragged onto an image.
    */
   if ( Parameters.isViewTarget )
   {
      resizeWindow( Parameters.targetView );
      return;
   }

   /*
    * Run normally on active image.
    */
   var window = ImageWindow.activeWindow;

   if ( window.isNull )
   {
      Console.writeln( "No active image window." );
      return;
   }

   resizeWindow( window.currentView );
}


// -----------------------------------------------------------------------------
// RUN
// -----------------------------------------------------------------------------

main();
