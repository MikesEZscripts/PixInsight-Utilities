/*
 * ViewIntegration.js
 *
 * PixInsight 1.9.x
 *
 * Integrates currently open PixInsight views with the native
 * ImageIntegration process.
 *
 * VERSION 2
 *
 * Adds:
 *   - Process icon / New Instance support.
 *   - Persistent parameters.
 *   - Saved ImageIntegration template icon name.
 *   - Saved cleanup setting.
 *   - Saved selected view IDs.
 *
 * Workflow:
 *
 *   1. Configure this dialog.
 *   2. Drag the blue triangle to the PixInsight workspace.
 *   3. The generated process icon stores these settings.
 *   4. Run the icon later to reopen this dialog with the settings restored.
 */

#feature-id    Utilities > ViewIntegration
#feature-info  Integrates open PixInsight views with the native ImageIntegration process.

#include <pjsr/Sizer.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdButton.jsh>


// ----------------------------------------------------------------------------
// Persistent parameters
// ----------------------------------------------------------------------------

function ViewIntegrationParameters()
{
   // Defaults
   this.integrationIcon = "";
   this.cleanup = true;
   this.selectedViews = "";


   // -------------------------------------------------------------------------
   // Load parameters from a saved Script process instance.
   // -------------------------------------------------------------------------

   this.load = function()
   {
      if ( Parameters.has( "integrationIcon" ) )
         this.integrationIcon =
            Parameters.getString( "integrationIcon" );

      if ( Parameters.has( "cleanup" ) )
         this.cleanup =
            Parameters.getBoolean( "cleanup" );

      if ( Parameters.has( "selectedViews" ) )
         this.selectedViews =
            Parameters.getString( "selectedViews" );
   };


   // -------------------------------------------------------------------------
   // Store parameters in the Script process instance.
   // -------------------------------------------------------------------------

   this.save = function()
   {
      Parameters.set(
         "integrationIcon",
         this.integrationIcon
      );

      Parameters.set(
         "cleanup",
         this.cleanup
      );

      Parameters.set(
         "selectedViews",
         this.selectedViews
      );
   };


   // -------------------------------------------------------------------------
   // Return saved view IDs as an array.
   // -------------------------------------------------------------------------

   this.selectedViewArray = function()
   {
      if ( this.selectedViews.length == 0 )
         return [];

      return this.selectedViews.split( "|" );
   };
}


var VIParameters = new ViewIntegrationParameters;


// ----------------------------------------------------------------------------
// Utility functions
// ----------------------------------------------------------------------------

function sanitizeId( s )
{
   return s.replace(
      /[^A-Za-z0-9_]/g,
      "_"
   );
}


function makeTempFilePath( viewId, index )
{
   var dir =
      File.systemTempDirectory;

   var stamp =
      (new Date).getTime();

   var rnd =
      Math.floor(
         Math.random()*1000000
      );

   return dir +
      "/ViewIntegration_" +
      stamp + "_" +
      rnd + "_" +
      index + "_" +
      sanitizeId( viewId ) +
      ".xisf";
}


// ----------------------------------------------------------------------------
// Temporary image creation
// ----------------------------------------------------------------------------

function makeTemporaryWindow(
   sourceView,
   tempId
)
{
   var image =
      sourceView.image;

   var w =
      new ImageWindow(
         1,
         1,
         image.numberOfChannels,
         image.bitsPerSample,
         image.sampleType == SampleType_Real,
         image.isColor,
         tempId
      );


   w.mainView.beginProcess(
      UndoFlag_NoSwapFile
   );


   try
   {
      w.mainView.image.assign(
         image
      );
   }
   catch ( e )
   {
      w.mainView.endProcess();

      w.forceClose();

      throw e;
   }


   w.mainView.endProcess();


   // -------------------------------------------------------------------------
   // Copy FITS keywords.
   // -------------------------------------------------------------------------

   try
   {
      w.keywords =
         sourceView.window.keywords;
   }
   catch ( e )
   {
   }


   return w;
}


// ----------------------------------------------------------------------------

function saveViewAsTemporaryXISF(
   sourceView,
   filePath,
   index
)
{
   var tempId =
      "__VI_TEMP_" +
      index + "_" +
      Math.floor(
         Math.random()*1000000
      );


   var w =
      makeTemporaryWindow(
         sourceView,
         tempId
      );


   try
   {
      if (
         !w.saveAs(
            filePath,
            false,
            false,
            false,
            false
         )
      )
      {
         throw new Error(
            "Unable to save temporary image:\n" +
            filePath
         );
      }
   }
   finally
   {
      w.forceClose();
   }
}


// ----------------------------------------------------------------------------

function removeTemporaryFile(
   filePath
)
{
   try
   {
      if ( File.exists( filePath ) )
         File.remove( filePath );
   }
   catch ( e )
   {
      console.warningln(
         "<end><cbr>" +
         "Unable to remove temporary file: ",
         filePath
      );
   }
}


// ----------------------------------------------------------------------------
// Process icon helper
// ----------------------------------------------------------------------------

function createImageIntegrationInstance(
   iconId
)
{
   if ( iconId.length == 0 )
   {
      console.writeln(
         "<end><cbr>" +
         "Using default ImageIntegration settings."
      );

      return new ImageIntegration;
   }


   console.writeln(
      "<end><cbr>" +
      "Loading ImageIntegration settings from process icon: ",
      iconId
   );


   var P =
      ProcessInstance.fromIcon(
         iconId
      );


   if ( P == null )
   {
      throw new Error(
         "Unable to find process icon '" +
         iconId +
         "'."
      );
   }


   if ( !(P instanceof ImageIntegration) )
   {
      throw new Error(
         "Process icon '" +
         iconId +
         "' is not an ImageIntegration instance."
      );
   }


   return P;
}


// ----------------------------------------------------------------------------
// Dialog
// ----------------------------------------------------------------------------

function ViewIntegrationDialog()
{
   this.__base__ = Dialog;
   this.__base__();


   var dialog = this;


   this.windowTitle =
      "View Integration";


   // -------------------------------------------------------------------------
   // Description
   // -------------------------------------------------------------------------

   this.description_Label =
      new Label( this );


   this.description_Label.text =
      "<b>View Integration</b><br/>" +

      "Select open images to integrate with PixInsight's native " +
      "ImageIntegration process.<br/><br/>" +

      "Optionally enter the identifier of an existing ImageIntegration " +
      "process icon to use all of its settings.";


   this.description_Label.useRichText =
      true;

   this.description_Label.wordWrapping =
      true;


   // -------------------------------------------------------------------------
   // View list
   // -------------------------------------------------------------------------

   this.viewList_Tree =
      new TreeBox( this );


   this.viewList_Tree.numberOfColumns =
      3;

   this.viewList_Tree.headerVisible =
      true;

   this.viewList_Tree.rootDecoration =
      false;

   this.viewList_Tree.alternateRowColor =
      true;

   this.viewList_Tree.multipleSelection =
      false;


   this.viewList_Tree.setHeaderText(
      0,
      "Use"
   );

   this.viewList_Tree.setHeaderText(
      1,
      "View"
   );

   this.viewList_Tree.setHeaderText(
      2,
      "Dimensions"
   );


   this.viewList_Tree.minWidth =
      550;

   this.viewList_Tree.minHeight =
      250;


   this.views = [];


   // -------------------------------------------------------------------------
   // Determine whether a saved view ID exists.
   // -------------------------------------------------------------------------

   this.savedViewSelected =
   function( viewId )
   {
      var saved =
         VIParameters.selectedViewArray();


      // No stored selection:
      // default to nothing selected.

      if ( saved.length == 0 )
         return false;


      for (
         var i = 0;
         i < saved.length;
         ++i
      )
      {
         if ( saved[i] == viewId )
            return true;
      }


      return false;
   };


   // -------------------------------------------------------------------------
   // Populate currently open views.
   // -------------------------------------------------------------------------

   this.populateViews =
   function()
   {
      this.viewList_Tree.clear();

      this.views = [];


      var windows =
         ImageWindow.windows;

   windows.sort(
      function( a, b )
      {
         var A =
            a.mainView.id.toLowerCase();

         var B =
            b.mainView.id.toLowerCase();

         return A < B ? -1 :
             A > B ?  1 :
                      0;
      }
   );

      for (
         var i = 0;
         i < windows.length;
         ++i
      )
      {
         var w =
            windows[i];


         if ( w.isNull )
            continue;


         var v =
            w.mainView;


         if ( v.isNull )
            continue;


         // Skip our own temporary windows.

         if (
            v.id.indexOf(
               "__VI_TEMP_"
            ) == 0
         )
         {
            continue;
         }


         var node =
            new TreeBoxNode(
               this.viewList_Tree
            );


         node.checkable =
            true;


         node.checked =
            this.savedViewSelected(
               v.id
            );


         node.setText(
            1,
            v.id
         );


         node.setText(
            2,
            format(
               "%d x %d x %d",
               v.image.width,
               v.image.height,
               v.image.numberOfChannels
            )
         );


         node.viewIndex =
            this.views.length;


         this.views.push(
            v
         );
      }


      this.viewList_Tree.adjustColumnWidthToContents(
         0
      );

      this.viewList_Tree.adjustColumnWidthToContents(
         1
      );

      this.viewList_Tree.adjustColumnWidthToContents(
         2
      );
   };


   // -------------------------------------------------------------------------
   // Collect selected view IDs.
   // -------------------------------------------------------------------------

   this.getSelectedViewIds =
   function()
   {
      var ids = [];


      for (
         var i = 0;
         i < this.viewList_Tree.numberOfChildren;
         ++i
      )
      {
         var node =
            this.viewList_Tree.child(
               i
            );


         if ( node.checked )
         {
            ids.push(
               this.views[
                  node.viewIndex
               ].id
            );
         }
      }


      return ids;
   };


   // -------------------------------------------------------------------------
   // Store GUI controls in our parameter object.
   // -------------------------------------------------------------------------

   this.updateParameters =
   function()
   {
      VIParameters.integrationIcon =
         this.icon_Edit.text.trim();


      VIParameters.cleanup =
         this.cleanup_CheckBox.checked;


      var ids =
         this.getSelectedViewIds();


      VIParameters.selectedViews =
         ids.join( "|" );
   };


   // -------------------------------------------------------------------------
   // View selection buttons
   // -------------------------------------------------------------------------

   this.selectAll_Button =
      new PushButton( this );

   this.selectAll_Button.text =
      "Select All";


   this.selectAll_Button.onClick =
   function()
   {
      for (
         var i = 0;
         i <
            dialog.viewList_Tree.numberOfChildren;
         ++i
      )
      {
         dialog.viewList_Tree.child(
            i
         ).checked = true;
      }
   };


   this.selectNone_Button =
      new PushButton( this );

   this.selectNone_Button.text =
      "Select None";


   this.selectNone_Button.onClick =
   function()
   {
      for (
         var i = 0;
         i <
            dialog.viewList_Tree.numberOfChildren;
         ++i
      )
      {
         dialog.viewList_Tree.child(
            i
         ).checked = false;
      }
   };


   this.refresh_Button =
      new PushButton( this );

   this.refresh_Button.text =
      "Refresh";


   this.refresh_Button.onClick =
   function()
   {
      // Remember current selection before refreshing.

      dialog.updateParameters();

      dialog.populateViews();
   };


   this.selectionButtons_Sizer =
      new HorizontalSizer;


   this.selectionButtons_Sizer.spacing =
      6;


   this.selectionButtons_Sizer.add(
      this.selectAll_Button
   );

   this.selectionButtons_Sizer.add(
      this.selectNone_Button
   );

   this.selectionButtons_Sizer.addStretch();

   this.selectionButtons_Sizer.add(
      this.refresh_Button
   );


   // -------------------------------------------------------------------------
   // ImageIntegration process icon
   // -------------------------------------------------------------------------

   this.icon_Label =
      new Label( this );


   this.icon_Label.text =
      "ImageIntegration icon:";


   this.icon_Label.textAlignment =
      TextAlign_Right |
      TextAlign_VertCenter;


   this.icon_Edit =
      new Edit( this );


   this.icon_Edit.text =
      VIParameters.integrationIcon;


   this.icon_Edit.toolTip =
      "<p>Optional. Enter the identifier of an existing " +
      "ImageIntegration process icon.</p>" +

      "<p>Example: <b>MyIntegration</b></p>" +

      "<p>If left blank, a new ImageIntegration instance " +
      "with default settings will be used.</p>";


   this.icon_Sizer =
      new HorizontalSizer;


   this.icon_Sizer.spacing =
      6;


   this.icon_Sizer.add(
      this.icon_Label
   );

   this.icon_Sizer.add(
      this.icon_Edit,
      100
   );


   // -------------------------------------------------------------------------
   // Cleanup
   // -------------------------------------------------------------------------

   this.cleanup_CheckBox =
      new CheckBox( this );


   this.cleanup_CheckBox.text =
      "Delete temporary XISF files after integration";


   this.cleanup_CheckBox.checked =
      VIParameters.cleanup;


   // -------------------------------------------------------------------------
   // New Instance button
   // -------------------------------------------------------------------------

   this.newInstance_Button =
      new ToolButton( this );


   this.newInstance_Button.icon =
      this.scaledResource(
         ":/process-interface/new-instance.png"
      );


   this.newInstance_Button.setScaledFixedSize(
      24,
      24
   );


   this.newInstance_Button.toolTip =
      "<p><b>New Instance</b></p>" +
      "<p>Drag this button to the PixInsight workspace " +
      "to create a process icon containing the current settings.</p>";


   this.newInstance_Button.onMousePress =
   function()
   {
      // Read settings from dialog.

      dialog.updateParameters();


      // Broadcast parameters to the Script process.

      VIParameters.save();


      // Create draggable Script process instance.

      dialog.newInstance();
   };


   // -------------------------------------------------------------------------
   // Integrate
   // -------------------------------------------------------------------------

   this.integrate_Button =
      new PushButton( this );


   this.integrate_Button.text =
      "Integrate";


   this.integrate_Button.defaultButton =
      true;


   this.integrate_Button.onClick =
   function()
   {
      dialog.updateParameters();

      dialog.ok();
   };


   // -------------------------------------------------------------------------
   // Cancel
   // -------------------------------------------------------------------------

   this.cancel_Button =
      new PushButton( this );


   this.cancel_Button.text =
      "Cancel";


   this.cancel_Button.onClick =
   function()
   {
      dialog.cancel();
   };


   // -------------------------------------------------------------------------
   // Bottom buttons
   // -------------------------------------------------------------------------

   this.buttons_Sizer =
      new HorizontalSizer;


   this.buttons_Sizer.spacing =
      6;


   this.buttons_Sizer.add(
      this.newInstance_Button
   );


   this.buttons_Sizer.addStretch();


   this.buttons_Sizer.add(
      this.integrate_Button
   );


   this.buttons_Sizer.add(
      this.cancel_Button
   );


   // -------------------------------------------------------------------------
   // Main layout
   // -------------------------------------------------------------------------

   this.sizer =
      new VerticalSizer;


   this.sizer.margin =
      8;

   this.sizer.spacing =
      8;


   this.sizer.add(
      this.description_Label
   );


   this.sizer.addSpacing(
      4
   );


   this.sizer.add(
      this.viewList_Tree,
      100
   );


   this.sizer.add(
      this.selectionButtons_Sizer
   );


   this.sizer.addSpacing(
      6
   );


   this.sizer.add(
      this.icon_Sizer
   );


   this.sizer.add(
      this.cleanup_CheckBox
   );


   this.sizer.addSpacing(
      6
   );


   this.sizer.add(
      this.buttons_Sizer
   );


   // -------------------------------------------------------------------------
   // Populate views AFTER controls exist.
   // -------------------------------------------------------------------------

   this.populateViews();


   this.adjustToContents();
}


ViewIntegrationDialog.prototype =
   new Dialog;


// ----------------------------------------------------------------------------
// Perform integration
// ----------------------------------------------------------------------------

function performIntegration(
   selectedViews,
   integrationIcon,
   cleanup
)
{
   console.show();


   console.writeln(
      "<end><cbr><br>" +
      "========================================"
   );


   console.writeln(
      "View Integration"
   );


   console.writeln(
      "========================================"
   );


   console.writeln(
      "Selected views: ",
      selectedViews.length
   );


   var tempFiles = [];


   try
   {
      // ----------------------------------------------------------------------
      // Export selected views to temporary XISF files
      // ----------------------------------------------------------------------

      for (
         var j = 0;
         j < selectedViews.length;
         ++j
      )
      {
         var view =
            selectedViews[j];


         var path =
            makeTempFilePath(
               view.id,
               j
            );


         console.writeln(
            "<end><cbr>Preparing ",
            view.id,
            " ..."
         );


         saveViewAsTemporaryXISF(
            view,
            path,
            j
         );


         tempFiles.push(
            path
         );
      }


      // ----------------------------------------------------------------------
      // Obtain ImageIntegration settings
      // ----------------------------------------------------------------------

      var II =
         createImageIntegrationInstance(
            integrationIcon
         );


      // ----------------------------------------------------------------------
      // Build ImageIntegration file table.
      // ----------------------------------------------------------------------

      var imageTable = [];


      for (
         var k = 0;
         k < tempFiles.length;
         ++k
      )
      {
         imageTable.push(
            [
               true,
               tempFiles[k],
               "",
               ""
            ]
         );
      }


      II.images =
         imageTable;


      console.writeln(
         "<end><cbr><br>" +
         "Running ImageIntegration..."
      );


      // ----------------------------------------------------------------------
      // Run native ImageIntegration
      // ----------------------------------------------------------------------

      var success =
         II.executeGlobal();


      if ( !success )
      {
         throw new Error(
            "ImageIntegration did not complete successfully."
         );
      }


      console.writeln(
         "<end><cbr><br>" +
         "ImageIntegration completed successfully."
      );
   }
   finally
   {
      // ----------------------------------------------------------------------
      // Cleanup
      // ----------------------------------------------------------------------

      if ( cleanup )
      {
         console.writeln(
            "<end><cbr><br>" +
            "Removing temporary files..."
         );


         for (
            var n = 0;
            n < tempFiles.length;
            ++n
         )
         {
            removeTemporaryFile(
               tempFiles[n]
            );
         }


         console.writeln(
            "Temporary files removed."
         );
      }
      else
      {
         console.writeln(
            "<end><cbr><br>" +
            "Temporary files retained:"
         );


         for (
            var m = 0;
            m < tempFiles.length;
            ++m
         )
         {
            console.writeln(
               "  ",
               tempFiles[m]
            );
         }
      }
   }
}


// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

function main()
{
   /*
    * Load parameters first.
    *
    * If launched normally from Script > Utilities > ViewIntegration,
    * there will usually be no parameters and defaults are used.
    *
    * If launched from a process icon, the parameters stored in that
    * icon will be restored here.
    */

   VIParameters.load();


   console.hide();


   var dialog =
      new ViewIntegrationDialog;


   if ( dialog.views.length < 2 )
   {
      (
         new MessageBox(
            "At least two image windows must be open.",
            "View Integration",
            StdIcon_Error,
            StdButton_Ok
         )
      ).execute();


      return;
   }


   // -------------------------------------------------------------------------
   // Show GUI.
   //
   // We intentionally show the dialog even when executed from a Script
   // process icon. This lets the icon function as a saved preset while
   // still allowing the currently open images to be reviewed before
   // integration.
   // -------------------------------------------------------------------------

   if ( !dialog.execute() )
      return;


   // -------------------------------------------------------------------------
   // Determine selected views
   // -------------------------------------------------------------------------

   var selectedViews = [];


   for (
      var i = 0;
      i < dialog.viewList_Tree.numberOfChildren;
      ++i
   )
   {
      var node =
         dialog.viewList_Tree.child(
            i
         );


      if ( node.checked )
      {
         selectedViews.push(
            dialog.views[
               node.viewIndex
            ]
         );
      }
   }


   if ( selectedViews.length < 2 )
   {
      (
         new MessageBox(
            "Please select at least two views.",
            "View Integration",
            StdIcon_Error,
            StdButton_Ok
         )
      ).execute();


      return;
   }


   // -------------------------------------------------------------------------
   // Update persistent parameters.
   // -------------------------------------------------------------------------

   dialog.updateParameters();

   VIParameters.save();


   // -------------------------------------------------------------------------
   // Integrate
   // -------------------------------------------------------------------------

   try
   {
      performIntegration(
         selectedViews,
         VIParameters.integrationIcon,
         VIParameters.cleanup
      );
   }
   catch ( e )
   {
      console.criticalln(
         "<end><cbr><br><b>Error:</b> ",
         e.message != undefined
            ? e.message
            : e
      );


      (
         new MessageBox(
            e.message != undefined
               ? e.message
               : String( e ),
            "View Integration",
            StdIcon_Error,
            StdButton_Ok
         )
      ).execute();
   }
}


main();
