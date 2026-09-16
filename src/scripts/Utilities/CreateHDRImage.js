#engine v8

#include "../Toolbox/PixInsightToolsPreviewControl.jsh"
#include <pjsr/SampleType.jsh>
#include <pjsr/DataType.jsh>

#feature-id CreateHDRImage : Utilities > CreateHDRImage

#feature-info  A script to create HDR images.<br/>\
   <br/>\
   A script to create HDR images. \
   <br/> \
   Copyright &copy; 2024 Juergen Terpe


#define VERSION "1.13"
#define TITLE  "Create HDR"
#define TEXT   "Add HDR to the image to improve details in the brighter zones of the target. <br><br>Copyright &copy; 2023-2025 J&uuml;rgen Terpe"

#define LEFTWIDTH 400

CoreApplication.ensureMinimumVersion( 1, 9, 4 );

var createHDRParameters = {
   image: undefined,
   replaceImage: false,
   previewImage: undefined,
   colorCorrection: false,
   toIntensity: false,
   useMedianTransform: false,
   mask: undefined,
   scalingFunction: "B3 Spline (5)",
   colorIntensity: 0.85,
   imageHDRBlend: 0.4,
   hdrLayers: 6,
   luminance: 0.0,
   saturation: 0.0,
   contrast: 0.0,
   maskSmoothness: 10.0,

   // stores the current parameters values into the script instance
   save: function() {
     Parameters.set("replaceImage", createHDRParameters.replaceImage);
     Parameters.set("colorCorrection", createHDRParameters.colorCorrection);
     Parameters.set("colorIntensity", createHDRParameters.colorIntensity);
     Parameters.set("imageHDRBlend", createHDRParameters.imageHDRBlend);
     Parameters.set("hdrLayers", createHDRParameters.hdrLayers);
     Parameters.set("toIntensity", createHDRParameters.toIntensity);
     Parameters.set("scalingFunction", createHDRParameters.scalingFunction);
     Parameters.set("medianTransform", createHDRParameters.useMedianTransform);
     Parameters.set("mask", createHDRParameters.mask != undefined ? createHDRParameters.mask.id : "");
     Parameters.set("luminance", createHDRParameters.luminance);
     Parameters.set("saturation", createHDRParameters.saturation);
     Parameters.set("contrast", createHDRParameters.contrast);
     Parameters.set("maskSmoothness", createHDRParameters.maskSmoothness);
   },

   // loads the script instance parameters
   load: function() {

      Console.writeln("Loading previous parameters...");
      if (Parameters.has("replaceImage"))
         createHDRParameters.replaceImage = Parameters.getBoolean("replaceImage");
      if (Parameters.has("colorCorrection"))
         createHDRParameters.colorCorrection = Parameters.getBoolean("colorCorrection");
      if (Parameters.has("colorIntensity"))
         createHDRParameters.colorIntensity = Parameters.getReal("colorIntensity");
      if (Parameters.has("imageHDRBlend"))
         createHDRParameters.increaseEdges = Parameters.getReal("imageHDRBlend");
      if (Parameters.has("hdrLayers"))
         createHDRParameters.hdrLayers = Parameters.getInteger("hdrLayers");
      if (Parameters.has("toIntensity"))
         createHDRParameters.toIntensity = Parameters.getBoolean("toIntensity");
      if (Parameters.has("scalingFunction"))
         createHDRParameters.scalingFunction = Parameters.getString("scalingFunction");

      if (Parameters.has("medianTransform"))
         createHDRParameters.useMedianTransform = Parameters.getBoolean("medianTransform");
      if (Parameters.has("mask")) {
         let id = View.viewById(Parameters.getString("mask"));
         createHDRParameters.mask = id;
      }

      if (Parameters.has("luminance"))
         createHDRParameters.luminance = Parameters.getReal("luminance");
      if (Parameters.has("saturation"))
         createHDRParameters.saturation = Parameters.getReal("saturation");
      if (Parameters.has("contrast"))
         createHDRParameters.contrast = Parameters.getReal("contrast");
      if (Parameters.has("maskSmoothness"))
         createHDRParameters.maskSmoothness = Parameters.getReal("maskSmoothness");
   }
}

function getPreviewKey() {

   try {

      if (createHDRParameters.image == undefined)
         return ""
      else {

         let maskId = createHDRParameters.mask == undefined ? "" : createHDRParameters.mask.id;

         let key = "Image: "+ createHDRParameters.image.id
            + ", HDR-Layers: " + createHDRParameters.hdrLayers
            + ", colorCorrected: " + createHDRParameters.colorCorrection
            + ", BlendAmount: " + createHDRParameters.imageHDRBlend
            + ", ColorIntensity: "+ createHDRParameters.colorIntensity
            + ", toIntensity: " +  createHDRParameters.toIntensity
            + ", scalingFunction: " + createHDRParameters.scalingFunction
            + ", medianTransform: " + createHDRParameters.useMedianTransform
            + ", mask: " + maskId
            + ", luminance: " + createHDRParameters.luminance
            + ", saturation: " + createHDRParameters.saturation
            + ", contrast: " + createHDRParameters.contrast
            + ", maskSmoothness: " + createHDRParameters.maskSmoothness;

         return key;
      }
   }
   catch(error) {
      Console.writeln(error);
      return "..."
   }
}



function createHDR(view, numLayers, numIterations = 1, swapFile=false) {

   var P = new HDRMultiscaleTransform;
   P.numberOfLayers = numLayers;
   P.numberOfIterations = numIterations;
   P.invertedIterations = true;
   P.overdrive = 0.000;
   P.medianTransform = createHDRParameters.useMedianTransform;

   if (createHDRParameters.scalingFunction == 'B3 Spline (5)') {
      P.scalingFunctionData = [
         0.003906,0.015625,0.023438,0.015625,0.003906,
         0.015625,0.0625,0.09375,0.0625,0.015625,
         0.023438,0.09375,0.140625,0.09375,0.023438,
         0.015625,0.0625,0.09375,0.0625,0.015625,
         0.003906,0.015625,0.023438,0.015625,0.003906
      ];
      P.scalingFunctionRowFilter = [
         0.0625,0.25,
         0.375,0.25,
         0.0625
      ];
      P.scalingFunctionColFilter = [
         0.0625,0.25,
         0.375,0.25,
         0.0625
      ];
      P.scalingFunctionName = "B3 Spline (5)";
   }
   else if (createHDRParameters.scalingFunction == 'Linear Interpolation (3)') {
      P.scalingFunctionData = [
         0.25,0.5,0.25,
         0.5,1,0.5,
         0.25,0.5,0.25
      ];
      P.scalingFunctionRowFilter = [
         0.5,
         1,
         0.5
      ];
      P.scalingFunctionColFilter = [
         0.5,
         1,
         0.5
      ];
      P.scalingFunctionName = "Linear Interpolation (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 3 (3)') {
      P.scalingFunctionData = [
         0.111111,0.333333,0.111111,
         0.333333,1,0.333333,
         0.111111,0.333333,0.111111
      ];
      P.scalingFunctionRowFilter = [
         0.333333,
         1,
         0.333333
      ];
      P.scalingFunctionColFilter = [
         0.333333,
         1,
         0.333333
      ];
      P.scalingFunctionName = "Small Scale 3 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 4 (3)') {
      P.scalingFunctionData = [
         0.0625,0.25,0.0625,
         0.25,1,0.25,
         0.0625,0.25,0.0625
      ];
      P.scalingFunctionRowFilter = [
         0.25,
         1,
         0.25
      ];
      P.scalingFunctionColFilter = [
         0.25,
         1,
         0.25
      ];
      P.scalingFunctionName = "Small Scale 4 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 5 (3)') {
      P.scalingFunctionData = [
         0.04,0.2,0.04,
         0.2,1,0.2,
         0.04,0.2,0.04
      ];
      P.scalingFunctionRowFilter = [
         0.2,
         1,
         0.2
      ];
      P.scalingFunctionColFilter = [
         0.2,
         1,
         0.2
      ];
      P.scalingFunctionName = "Small Scale 5 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 6 (3)') {
      P.scalingFunctionData = [
         0.027778,0.166667,0.027778,
         0.166667,1,0.166667,
         0.027778,0.166667,0.027778
      ];
      P.scalingFunctionRowFilter = [
         0.166667,
         1,
         0.166667
      ];
      P.scalingFunctionColFilter = [
         0.166667,
         1,
         0.166667
      ];
      P.scalingFunctionName = "Small Scale 6 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 8 (3)') {
      P.scalingFunctionData = [
         0.015625,0.125,0.015625,
         0.125,1,0.125,
         0.015625,0.125,0.015625
      ];
      P.scalingFunctionRowFilter = [
         0.125,
         1,
         0.125
      ];
      P.scalingFunctionColFilter = [
         0.125,
         1,
         0.125
      ];
      P.scalingFunctionName = "Small Scale 8 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 12 (3)') {
      P.scalingFunctionData = [
         0.006944,0.083333,0.006944,
         0.083333,1,0.083333,
         0.006944,0.083333,0.006944
      ];
      P.scalingFunctionRowFilter = [
         0.083333,
         1,
         0.083333
      ];
      P.scalingFunctionColFilter = [
         0.083333,
         1,
         0.083333
      ];
      P.scalingFunctionName = "Small Scale 12 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 16 (3)') {
      P.scalingFunctionData = [
         0.003906,0.0625,0.003906,
         0.0625,1,0.0625,
         0.003906,0.0625,0.003906
      ];
      P.scalingFunctionRowFilter = [
         0.0625,
         1,
         0.0625
      ];
      P.scalingFunctionColFilter = [
         0.0625,
         1,
         0.0625
      ];
      P.scalingFunctionName = "Small Scale 16 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 24 (3)') {
      P.scalingFunctionData = [
         0.001736,0.041667,0.001736,
         0.041667,1,0.041667,
         0.001736,0.041667,0.001736
      ];
      P.scalingFunctionRowFilter = [
         0.041667,
         1,
         0.041667
      ];
      P.scalingFunctionColFilter = [
         0.041667,
         1,
         0.041667
      ];
      P.scalingFunctionName = "Small Scale 24 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Small Scale 32 (3)') {
      P.scalingFunctionData = [
         0.000977,0.03125,0.000977,
         0.03125,1,0.03125,
         0.000977,0.03125,0.000977
      ];
      P.scalingFunctionRowFilter = [
         0.03125,
         1,
         0.03125
      ];
      P.scalingFunctionColFilter = [
         0.03125,
         1,
         0.03125
      ];
      P.scalingFunctionName = "Small Scale 32 (3)";
   }
   else if (createHDRParameters.scalingFunction == 'Gaussian (5)') {
      P.scalingFunctionData = [
         0.0001,0.003162,0.01,0.003162,0.0001,
         0.003162,0.1,0.316228,0.1,0.003162,
         0.01,0.316228,1,0.316228,0.01,
         0.003162,0.1,0.316228,0.1,0.003162,
         0.0001,0.003162,0.01,0.003162,0.0001
      ];
      P.scalingFunctionRowFilter = [
         0.01,0.316228,
         1,0.316228,
         0.01
      ];
      P.scalingFunctionColFilter = [
         0.01,0.316228,
         1,0.316228,
         0.01
      ];
      P.scalingFunctionName = "Gaussian (5)";
   }
   else if (createHDRParameters.scalingFunction == 'Gaussian (7)') {
      P.scalingFunctionData = [
         0.0001,0.001292,0.005995,0.01,0.005995,0.001292,0.0001,
         0.001292,0.016681,0.077426,0.129155,0.077426,0.016681,0.001292,
         0.005995,0.077426,0.359381,0.599484,0.359381,0.077426,0.005995,
         0.01,0.129155,0.599484,1,0.599484,0.129155,0.01,
         0.005995,0.077426,0.359381,0.599484,0.359381,0.077426,0.005995,
         0.001292,0.016681,0.077426,0.129155,0.077426,0.016681,0.001292,
         0.0001,0.001292,0.005995,0.01,0.005995,0.001292,0.0001
      ];
      P.scalingFunctionRowFilter = [
         0.01,0.129155,
         0.599484,1,
         0.599484,0.129155,
         0.01
      ];
      P.scalingFunctionColFilter = [
         0.01,0.129155,
         0.599484,1,
         0.599484,0.129155,
         0.01
      ];
      P.scalingFunctionName = "Gaussian (7)";
   }
   else if (createHDRParameters.scalingFunction == 'Gaussian (9)') {
      P.scalingFunctionData = [
         0.0001,0.00075,0.003162,0.007499,0.01,0.007499,0.003162,0.00075,0.0001,
         0.00075,0.005623,0.023714,0.056234,0.074989,0.056234,0.023714,0.005623,0.00075,
         0.003162,0.023714,0.1,0.237137,0.316228,0.237137,0.1,0.023714,0.003162,
         0.007499,0.056234,0.237137,0.562341,0.749894,0.562341,0.237137,0.056234,0.007499,
         0.01,0.074989,0.316228,0.749894,1,0.749894,0.316228,0.074989,0.01,
         0.007499,0.056234,0.237137,0.562341,0.749894,0.562341,0.237137,0.056234,0.007499,
         0.003162,0.023714,0.1,0.237137,0.316228,0.237137,0.1,0.023714,0.003162,
         0.00075,0.005623,0.023714,0.056234,0.074989,0.056234,0.023714,0.005623,0.00075,
         0.0001,0.00075,0.003162,0.007499,0.01,0.007499,0.003162,0.00075,0.0001
      ];
      P.scalingFunctionRowFilter = [
         0.01,0.074989,0.316228,
         0.749894,1,0.749894,
         0.316228,0.074989,0.01
      ];
      P.scalingFunctionColFilter = [
         0.01,0.074989,0.316228,
         0.749894,1,0.749894,
         0.316228,0.074989,0.01
      ];
      P.scalingFunctionName = "Gaussian (9)";
   }
   else if (createHDRParameters.scalingFunction == 'Gaussian (12)') {
      P.scalingFunctionData = [
         0.0001,0.000525,0.001905,0.004786,0.008318,0.01,0.008318,0.004786,0.001905,0.000525,0.0001,
         0.000525,0.002754,0.01,0.025119,0.043652,0.052481,0.043652,0.025119,0.01,0.002754,0.000525,
         0.001905,0.01,0.036308,0.091201,0.158489,0.190546,0.158489,0.091201,0.036308,0.01,0.001905,
         0.004786,0.025119,0.091201,0.229087,0.398107,0.47863,0.398107,0.229087,0.091201,0.025119,0.004786,
         0.008318,0.043652,0.158489,0.398107,0.691831,0.831764,0.691831,0.398107,0.158489,0.043652,0.008318,
         0.01,0.052481,0.190546,0.47863,0.831764,1,0.831764,0.47863,0.190546,0.052481,0.01,
         0.008318,0.043652,0.158489,0.398107,0.691831,0.831764,0.691831,0.398107,0.158489,0.043652,0.008318,
         0.004786,0.025119,0.091201,0.229087,0.398107,0.47863,0.398107,0.229087,0.091201,0.025119,0.004786,
         0.001905,0.01,0.036308,0.091201,0.158489,0.190546,0.158489,0.091201,0.036308,0.01,0.001905,
         0.000525,0.002754,0.01,0.025119,0.043652,0.052481,0.043652,0.025119,0.01,0.002754,0.000525,
         0.0001,0.000525,0.001905,0.004786,0.008318,0.01,0.008318,0.004786,0.001905,0.000525,0.0001
      ];
      P.scalingFunctionRowFilter = [
         0.01,0.052481,0.190546,
         0.47863,0.831764,1,
         0.831764,0.47863,0.190546,
         0.052481,0.01
      ];
      P.scalingFunctionColFilter = [
         0.01,0.052481,0.190546,
         0.47863,0.831764,1,
         0.831764,0.47863,0.190546,
         0.052481,0.01
      ];
      P.scalingFunctionName = "Gaussian (12)";
   }

   Console.noteln('Scaling function: '+ P.scalingFunctionName);

   P.deringing = false;
   P.smallScaleDeringing = 0.000;
   P.largeScaleDeringing = 0.250;
   P.outputDeringingMaps = false;
   P.midtonesBalanceMode = HDRMultiscaleTransform.Automatic;
   P.midtonesBalance = 0.500000;
   P.toLightness = true;
   P.preserveHue = true;
   P.toIntensity = createHDRParameters.toIntensity;
   P.preserveHue = !createHDRParameters.toIntensity;
   P.luminanceMask = true;

   P.executeOn(view, swapFile);
}

function clone(view) {
   var P = new PixelMath;
   P.expression = "$T";
   P.useSingleExpression = true;
   P.clearImageCacheAndExit = false;
   P.cacheGeneratedImages = false;
   P.generateOutput = true;
   P.singleThreaded = false;
   P.optimization = true;
   P.use64BitWorkingImage = false;
   P.rescale = false;
   P.truncate = true;
   P.createNewImage = true;
   P.showNewImage = false;
   P.newImageId = view.id + "_cloned";
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.SameAsTarget;
   P.newImageSampleFormat = PixelMath.SameAsTarget;
   P.executeOn(view);

   return View.viewById(P.newImageId);
}

function blurMask(view) {

   Console.writeln("gconv($T, " + createHDRParameters.maskSmoothness + ")");

   var P = new PixelMath;
   P.expression = "gconv($T, " + createHDRParameters.maskSmoothness + ")";
   P.useSingleExpression = true;
   P.clearImageCacheAndExit = false;
   P.cacheGeneratedImages = false;
   P.generateOutput = true;
   P.singleThreaded = false;
   P.optimization = true;
   P.use64BitWorkingImage = false;
   P.rescale = true;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;
   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;
   P.createNewImage = false;

   P.newImageColorSpace = PixelMath.Gray;
   P.newImageSampleFormat = PixelMath.SameAsTarget;

   P.executeOn(view, false);
}


function createLuminanceMask(view) {
   var P = new PixelMath;
   P.expression = "CIEL($T)";
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
   P.rescale = true;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;
   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;
   P.createNewImage = true;
   P.showNewImage = false;
   P.newImageId = view.id + "_LuminanceMask_tmp";
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.Gray;
   P.newImageSampleFormat = PixelMath.SameAsTarget;

   P.executeOn(view, false);
   let maskView = View.viewById(P.newImageId);
   blurMask(maskView);

   return maskView;
}

function blendViews(viewA, viewB, amountA, postfix, swapfile = false) {

   var P = new PixelMath;
   P.expression = amountA+"*"+viewA.id+" + "+(1.0 - amountA)+"*"+viewB.id;
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

   if (postfix !== undefined) {
      P.newImageId = "blend_"+viewA.id+"_"+viewB.id+"_"+postfix;
      P.showNewImage = false;
   } else {
      P.newImageId = "blend_"+viewA.id+"_"+viewB.id;
      P.showNewImage = false;
   }
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.SameAsTarget;
   P.newImageSampleFormat = PixelMath.SameAsTarget;

   P.executeOn(viewA, swapfile);

   return View.viewById(P.newImageId);
}

function processLuminanceCurves(view, lum, swapfile=true) {

   if (Math.abs(lum) > 0.0001) {
      let fac = lum/100.0;

      var P = new CurvesTransformation;
      P.L = [ // x, y
         [0.00000, 0.00000],
         [0.5, 0.5 + 0.4*fac],
         [1.00000, 1.00000]
      ];
      P.Lt = CurvesTransformation.AkimaSubsplines;

      P.executeOn(view, swapfile);
   }
}

function processSaturationCurves(view, sat, swapfile=true) {

   if (Math.abs(sat) > 0.0001) {
      let fac = sat/100.0;

      var P = new CurvesTransformation;
      P.S = [ // x, y
         [0.00000, 0.00000],
         [0.25, 0.25 + 0.2*fac],
         [0.5, 0.5 + 0.4*fac],
         [0.75, 0.75 + 0.25*fac],
         [1.00000, 1.00000]
      ];
      P.St = CurvesTransformation.AkimaSubsplines;

      P.executeOn(view, swapfile);
   }
}

function processContrastCurves(view, contrast, swapfile=true) {

   if (Math.abs(contrast) > 0.0001) {
      let fac = contrast/100.0;

      var P = new CurvesTransformation;
      P.L = [ // x, y
         [0.00000, 0.00000],
         [0.25, 0.25 - 0.2*fac],
         [0.75, 0.75 + 0.2*fac],
         [1.00000, 1.00000]
      ];
      P.Lt = CurvesTransformation.AkimaSubsplines;

      P.executeOn(view, swapfile);
   }
}

function processCurves(view, swapfile = false) {
   processLuminanceCurves(view, createHDRParameters.luminance, swapfile);
   processSaturationCurves(view, createHDRParameters.saturation, swapfile);
   processContrastCurves(view, createHDRParameters.contrast, swapfile);
}


function processPreview() {
   if (createHDRParameters.image) {

         var previewImage = new Image(createHDRParameters.image.image);
         var hdrClone = previewImage;
         try
         {
            var previewOriginalWindow = new ImageWindow(hdrClone.width, hdrClone.height, hdrClone.numberOfChannels, hdrClone.bitsPerSample,
                                 hdrClone.sampleType == SampleType_Real, hdrClone.isColor, createHDRParameters.image.id + "_original_temp" );
            var originview = previewOriginalWindow.mainView;
            originview.beginProcess( UndoFlag.NoSwapFile );
            originview.image.assign( hdrClone );
            originview.endProcess();

            var previewWindow = new ImageWindow(hdrClone.width, hdrClone.height, hdrClone.numberOfChannels, hdrClone.bitsPerSample,
                                 hdrClone.sampleType == SampleType_Real, hdrClone.isColor, createHDRParameters.image.id + "_preview_temp" );
            var view = previewWindow.mainView;
            view.beginProcess( UndoFlag.NoSwapFile );
            view.image.assign( hdrClone );
            view.endProcess();

            if (createHDRParameters.mask) {
               view.window.setMask(createHDRParameters.mask.window);
            }

            createHDR(view, createHDRParameters.hdrLayers, 1, false);

            if (FMath.abs(createHDRParameters.luminance)>0.001
               || FMath.abs(createHDRParameters.saturation)>0.001
               || FMath.abs(createHDRParameters.contrast)>0.001) {

               if (!createHDRParameters.mask) {
                  let mask = createLuminanceMask(view);
                  view.window.setMask(mask.window);

                  processCurves(view, false);
                  view.window.removeMask();

                  mask.window.forceClose();
               }
               else {
                  processCurves(view, false);
               }
            }

            var combinedView = blendViews(view, originview, createHDRParameters.imageHDRBlend, "blend_temp");

            if (createHDRParameters.previewImage) {
               createHDRParameters.previewImage.free();
            }
            createHDRParameters.previewImage = new Image(combinedView.image);
            combinedView.window.forceClose();

            if (createHDRParameters.mask) {
               view.window.removeMask();
            }

         }
         finally {
            if (previewOriginalWindow)
               previewOriginalWindow.forceClose();
            if (previewWindow)
               previewWindow.forceClose();
            if (previewImage)
               previewImage.free();


         }
   }

}

function process() {

   if (createHDRParameters.image) {

      var hdrClone = clone(createHDRParameters.image);

      if (createHDRParameters.mask) {
         hdrClone.window.setMask(createHDRParameters.mask.window);
      }

      createHDR(
         hdrClone,
         createHDRParameters.hdrLayers,
         1,
         true
      );

      if (
         Math.abs(createHDRParameters.luminance) > 0.001 ||
         Math.abs(createHDRParameters.saturation) > 0.001 ||
         Math.abs(createHDRParameters.contrast) > 0.001
      ) {

         if (!createHDRParameters.mask) {

            let mask = createLuminanceMask(hdrClone);

            hdrClone.window.setMask(mask.window);

            processCurves(hdrClone, true);

            hdrClone.window.removeMask();

            mask.window.forceClose();

         }
         else {

            processCurves(hdrClone, true);

         }
      }

      if (createHDRParameters.mask) {
         hdrClone.window.removeMask();
      }

      // ---------------------------------------------------------
      // Replace original image
      // ---------------------------------------------------------
      if (createHDRParameters.replaceImage) {

         var combinedView = blendViews(
            hdrClone,
            createHDRParameters.image,
            createHDRParameters.imageHDRBlend,
            "blend_temp",
            true
         );

         createHDRParameters.image.beginProcess();

         createHDRParameters.image.image.assign(
            combinedView.image
         );

         createHDRParameters.image.endProcess();

         combinedView.window.forceClose();

      }

      // ---------------------------------------------------------
      // Create new HDR image
      // ---------------------------------------------------------
      else {

         var combinedView = blendViews(
            hdrClone,
            createHDRParameters.image,
            createHDRParameters.imageHDRBlend,
            "HDR",
            true
         );

         // Rename the final image using the original image name.
         //
         // Example:
         // Image01  -->  Image01_HDR
         combinedView.id =
            createHDRParameters.image.id + "_HDR";

         // Copy FITS keywords from the original image.
         let originWindow =
            createHDRParameters.image.window;

         combinedView.window.keywords =
            originWindow.keywords;

         // Preserve the astrometric solution if one exists.
         if (originWindow.hasAstrometricSolution) {

            combinedView.window.copyAstrometricSolution(
               originWindow
            );

         }

         combinedView.window.show();

      }

      // Close the temporary HDR clone.
      hdrClone.window.forceClose();

   }

}

function closeView(view) {
   if (view && view.window && !view.window.isNull) {
      try {
         Console.writeln("closing view: "+view.id);
         view.window.forceClose();
      }
      catch(error) {
         Console.writeln("could not close view...");
      }
   }
}

class CreateHDRImageDialog extends Dialog {

   constructor() {
      super();
      this.scaledMinWidth = 1280;
      this.scaledMinHeight = 800;

      this.helpLabel = new Label( this );
      this.helpLabel.scaledMinWidth = LEFTWIDTH;
      this.helpLabel.scaledMaxWidth = LEFTWIDTH;
      this.helpLabel.frameStyle = FrameStyle.Box;
      this.helpLabel.margin = 4;
      this.helpLabel.wordWrapping = true;
      this.helpLabel.useRichText = true;
      this.helpLabel.text = "<b>" + TITLE + " v"
                           + VERSION + "</b> &mdash; "
                           + TEXT;

      this.imageGroup = new GroupBox(this);
      this.imageGroup.title = "Image";
      this.imageGroup.scaledMinWidth = LEFTWIDTH;
      this.imageGroup.scaledMaxWidth = LEFTWIDTH;
      this.imageGroup.sizer = new VerticalSizer();

      this.imageViewSelectorFrame = new Frame(this);
      this.imageViewSelectorFrame.scaledMinWidth = LEFTWIDTH;
      this.imageViewSelectorFrame.scaledMaxWidth = LEFTWIDTH;
      this.imageViewSelectLabel = new Label(this);
      this.imageViewSelectLabel.text = "Target View:";
      this.imageViewSelectLabel.toolTip = "<p>Select the view to be processed.</p>";
      this.imageViewSelectLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;

      this.imageViewSelector = new ViewList(this);
      this.imageViewSelector.scaledMaxWidth = 250;
      this.imageViewSelector.getMainViews();

      this.imageSizer = new HorizontalSizer();
      this.imageSizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;

      this.imageSizer.margin = 4;
      this.imageSizer.add(this.imageViewSelectLabel);
      this.imageSizer.addSpacing(8);
      this.imageSizer.add(this.imageViewSelector);

      this.maskViewSelectLabel = new Label(this);
      this.maskViewSelectLabel.text = "Mask (optional):";
      this.maskViewSelectLabel.toolTip = "<p>Select a mask to protect parts of the image (optional).</p>";
      this.maskViewSelectLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;

      this.maskViewSelector = new ViewList(this);
      this.maskViewSelector.scaledMaxWidth = 250;
      this.maskViewSelector.getMainViews();
      this.maskViewSelector.enabled = false;

      this.maskSizer = new HorizontalSizer();
      this.maskSizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;

      this.maskSizer.margin = 4;
      this.maskSizer.add(this.maskViewSelectLabel);
      this.maskSizer.addSpacing(8);
      this.maskSizer.add(this.maskViewSelector);

      this.imageViewSelectorFrame.sizer = new VerticalSizer();
      this.imageViewSelectorFrame.sizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;
      this.imageViewSelectorFrame.sizer.margin = 8;

      this.imageViewSelectorFrame.sizer.add(this.imageSizer);
      this.imageViewSelectorFrame.sizer.addSpacing(12);
      this.imageViewSelectorFrame.sizer.add(this.maskSizer);

      this.imageGroup.sizer.add(this.imageViewSelectorFrame);
      this.imageGroup.sizer.addSpacing(8);

      this.imageViewSelector.onViewSelected = function(view) {

         if (view == undefined || view.isNull) {
            return;
         }

         this.dialog.previewTimer.stop();

         createHDRParameters.image = view;
         if (createHDRParameters.previewImage !== undefined) {
            createHDRParameters.previewImage.free();
         }
         createHDRParameters.previewImage = undefined;
         if (view !== undefined) {
            var previewImage = new Image(view.image);

            var metadata = {
               width: previewImage.width,
               height: previewImage.height
            }

            this.dialog.previewControl.SetPreview(previewImage, createHDRParameters.image, metadata);
            createHDRParameters.previewImage = previewImage;
            this.dialog.maskViewSelector.enabled = true;
         }
         else this.maskViewSelector.enabled = false;

         this.dialog.previewTimer.previewKey = "..";
         this.dialog.previewTimer.start();
      };

      this.maskViewSelector.onViewSelected = function(view) {
         this.dialog.previewTimer.stop();

         if (view.image.isGrayscale
            && view.image.width == createHDRParameters.image.image.width
            && view.image.height == createHDRParameters.image.image.height) {
            createHDRParameters.mask = view;
            this.dialog.previewTimer.previewKey = "..";
         }

         this.dialog.previewTimer.start();
      };

      this.controlBar = new SectionBar(this, "High Dynamic Range");
      this.controlBar.scaledMinWidth = LEFTWIDTH;
      this.controlBar.scaledMaxWidth = LEFTWIDTH;
      this.controlControl = new Control(this);
      this.controlControl.scaledMinWidth = LEFTWIDTH;
      this.controlControl.scaledMaxWidth = LEFTWIDTH;

      this.controlBar.onToggleSection =  function( section, toggleBegin ) {
         if ( !toggleBegin ) {
            section.dialog.adjustToContents();
            section.dialog.setVariableSize();
         }
      }

      this.controlBar.setSection( this.controlControl );

      this.controlHDRFrame = new Frame(this);
      this.controlHDRFrame.backgroundColor = 0xFFD8D7D3;
      this.controlHDRFrame.scaledMinWidth = LEFTWIDTH;
      this.controlHDRFrame.scaledMaxWidth = LEFTWIDTH;
      this.layersSizer = new HorizontalSizer();
      this.layersSizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;

      this.layersSelector = new ComboBox(this);
      this.layersLabel = new Label( this );
      this.layersLabel.wordWrapping = true;
      this.layersLabel.text = "Layers:  ";
      this.layersLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;

      this.layersSelector.toolTip = "<p>Increase the number of layers to work on larger scales, decreasing the number of layers will work on smaller scales.</p>";
      this.layersSelector.scaledMaxWidth = LEFTWIDTH-10;

      this.layersSelector.addItem("4");
      this.layersSelector.addItem("5");
      this.layersSelector.addItem("6");
      this.layersSelector.addItem("7");
      this.layersSelector.addItem("8");
      this.layersSelector.addItem("9");

      this.layersSelector.currentItem = 2;

      this.layersSizer.add(this.layersLabel);
      this.layersSizer.add(this.layersSelector);
      this.layersSizer.addSpacing(6);

      this.scalingSizer = new HorizontalSizer();
      this.scalingSizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;

      this.scalingFunctionSelector = new ComboBox(this);
      this.scalingFunctionLabel = new Label( this );
      this.scalingFunctionLabel.wordWrapping = true;
      this.scalingFunctionLabel.text = "Scaling function:  ";
      this.scalingFunctionLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;

      this.scalingFunctionSelector.toolTip = "<p>Select the scaling function to be used for HDR scaling.</p>";
      this.scalingFunctionSelector.scaledMaxWidth = LEFTWIDTH-10;

      this.scalingFunctionSelector.addItem("Linear Interpolation (3)");
      this.scalingFunctionSelector.addItem("B3 Spline (5)");
      this.scalingFunctionSelector.addItem("Small Scale 3 (3)");
      this.scalingFunctionSelector.addItem("Small Scale 4 (3)");
      this.scalingFunctionSelector.addItem("Small Scale 5 (3)");
      this.scalingFunctionSelector.addItem("Small Scale 6 (3)");
      this.scalingFunctionSelector.addItem("Small Scale 8 (3)");
      this.scalingFunctionSelector.addItem("Small Scale 12 (3)");
      this.scalingFunctionSelector.addItem("Small Scale 16 (3)");
      this.scalingFunctionSelector.addItem("Small Scale 24 (3)");
      this.scalingFunctionSelector.addItem("Small Scale 32 (3)");
      this.scalingFunctionSelector.addItem("Gaussian (5)");
      this.scalingFunctionSelector.addItem("Gaussian (7)");
      this.scalingFunctionSelector.addItem("Gaussian (9)");
      this.scalingFunctionSelector.addItem("Gaussian (12)");

      this.scalingFunctionSelector.currentItem = 1;
      this.scalingSizer.add(this.scalingFunctionLabel);
      this.scalingSizer.add(this.scalingFunctionSelector);
      this.scalingSizer.addSpacing(6);

      this.blendSizer = new HorizontalSizer;

      this.blendSlider = new NumericControl(this);
      this.blendSlider.label.text = "Blend:  ";
      this.blendSlider.toolTip = "<p>Increasing the blend parameter will add more HDR to the result.</p>";
      this.blendSlider.setRange(0.0, 1.0);
      this.blendSlider.slider.setRange(0.0, 100.0);
      this.blendSlider.setPrecision(2);
      this.blendSlider.setReal(true);
      this.blendSlider.setValue(createHDRParameters.imageHDRBlend);

      this.resetBlendButton = new ToolButton( this );
      this.resetBlendButton.icon = this.scaledResource( ":/icons/clear-inverted.png" );
      this.resetBlendButton.setScaledFixedSize( 24, 24 );
      this.resetBlendButton.toolTip = "<p>Reset the blend parameter.</p>";
      this.resetBlendButton.onClick = () => {
         let timerWasRunning = this.dialog.previewTimer.isRunning;
         this.dialog.previewTimer.stop();
         this.blendSlider.setValue(0.25);
         createHDRParameters.imageHDRBlend = 0.25;
         if (timerWasRunning) this.dialog.previewTimer.start();
      }

      this.blendSizer.add(this.blendSlider);
      this.blendSizer.add(this.resetBlendButton);

      this.layersSelector.onItemSelected = function(index) {
         this.dialog.previewTimer.stop();
         createHDRParameters.hdrLayers = parseInt(this.itemText(index));
         this.dialog.previewTimer.start();
      };

      this.blendSlider.onValueUpdated = function(t) {
         this.dialog.previewTimer.stop();
         createHDRParameters.imageHDRBlend = t;
         this.dialog.previewTimer.start();
      };

      this.scalingFunctionSelector.onItemSelected = function(index) {
         this.dialog.previewTimer.stop();
         createHDRParameters.scalingFunction = this.itemText(index);
         this.dialog.previewTimer.start();
      };

      this.checkboxFrame = new Frame;
      this.checkboxFrame.scaledMinWidth = LEFTWIDTH-24;
      this.checkboxFrame.scaledMaxWidth = LEFTWIDTH-24;
      this.checkboxFrame.sizer = new HorizontalSizer;
      this.checkboxFrame.sizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;
      this.checkboxFrame.sizer.spacing = 16;

      this.medianTransformCheckbox = new CheckBox(this);
      this.medianTransformCheckbox.text = "Median Transform";
      this.medianTransformCheckbox.checked = createHDRParameters.toIntensity;
      this.medianTransformCheckbox.toolTip = "<p>Uses Median Transform to avoid the Gibbs effect as much as possible. However, this dramatically increases the computation time!</p>";
      this.checkboxFrame.sizer.add(this.medianTransformCheckbox);
      this.checkboxFrame.sizer.addStretch();

      this.medianTransformCheckbox.onCheck = function(checked) {
         this.dialog.previewTimer.stop();
         createHDRParameters.useMedianTransform = checked;
         if (checked)
         {
            this.dialog.updatePreview_Button.show();
            this.dialog.previewTimer.updatePreview = false;
         }
         else
         {
            this.dialog.updatePreview_Button.hide();
            this.dialog.previewTimer.updatePreview = true;
         }

         this.dialog.previewTimer.previewKey = "....";
         this.dialog.previewTimer.start();
      }

      this.toIntensityCheckbox = new CheckBox(this);
      this.toIntensityCheckbox.text = "Intensity";
      this.toIntensityCheckbox.checked = createHDRParameters.toIntensity;
      this.toIntensityCheckbox.toolTip = "<p>Create HDR on Intensity.</p>";
      this.checkboxFrame.sizer.add(this.toIntensityCheckbox);

      this.toIntensityCheckbox.onCheck = function(checked) {
         this.dialog.previewTimer.stop();
         createHDRParameters.toIntensity = checked;
         this.dialog.previewTimer.previewKey = "....";
         this.dialog.previewTimer.start();
      }

      this.replaceImage = new CheckBox(this);
      this.replaceImage.text = "Replace image";
      this.replaceImage.checked = true;
      this.replaceImage.toolTip = "<p>Replace the target image with the result.</p>";
      this.checkboxFrame.sizer.add(this.replaceImage);

      this.updatePreview_Button = new PushButton( this );
      this.updatePreview_Button.text = "     Update Preview   ";
      this.updatePreview_Button.scaledMinWidth = LEFTWIDTH/3;
      this.updatePreview_Button.icon = this.scaledResource( ":/icons/refresh.png" );

      this.updatePreview_Button.toolTip = "<p>Update the preview.</p>";

      this.updatePreview_Button.onClick = () => {

         this.dialog.previewTimer.stop();
         if (this.dialog.busy) return;
         this.dialog.previewTimer.updatePreview = true;
         this.dialog.previewTimer.start();
      };

      if (!createHDRParameters.useMedianTransform)
         this.updatePreview_Button.hide();

      this.updatePreviewSizer = new HorizontalSizer;
      this.updatePreviewSizer.addStretch();
      this.updatePreviewSizer.add(this.updatePreview_Button);
      this.updatePreviewSizer.addStretch();

      this.controlHDRFrame.sizer = new VerticalSizer();
      this.controlHDRFrame.sizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;

      this.controlHDRFrame.sizer.margin = 6;
      this.controlHDRFrame.sizer.add(this.layersSizer);
      this.controlHDRFrame.sizer.addSpacing(8);
      this.controlHDRFrame.sizer.add(this.blendSizer);
      this.controlHDRFrame.sizer.addSpacing(24);
      this.controlHDRFrame.sizer.add(this.scalingSizer);
      this.controlHDRFrame.sizer.addSpacing(16);
      this.controlHDRFrame.sizer.add(this.checkboxFrame);
      this.controlHDRFrame.sizer.addSpacing(24);
      this.controlHDRFrame.sizer.add(this.updatePreviewSizer);
      this.controlHDRFrame.sizer.addSpacing(8);

      this.controlControl.sizer = new VerticalSizer();
      this.controlControl.backgroundColor = 0xFFD8D7D3;

      this.controlControl.sizer.margin = 6;
      this.controlControl.sizer.add(this.controlHDRFrame);

      this.lumSatBar = new SectionBar(this, "Luminance, Saturation and Contrast");
      this.lumSatBar.scaledMinWidth = LEFTWIDTH;
      this.lumSatBar.scaledMaxWidth = LEFTWIDTH;
      this.lumSatControl = new Control(this);
      this.lumSatControl.scaledMinWidth = LEFTWIDTH;
      this.lumSatControl.scaledMaxWidth = LEFTWIDTH;

      this.lumSatBar.onToggleSection =  function( section, toggleBegin ) {
         if ( !toggleBegin ) {
            section.dialog.adjustToContents();
            section.dialog.setVariableSize();
         }
      }

      this.lumSatBar.setSection( this.lumSatControl );
      let labelMinWidth = Math.round(this.font.width("Luminance:M"));
      let sliderMinWidth = LEFTWIDTH - labelMinWidth - 100;

      this.blackSlider = new NumericControl(this);
      this.blackSlider.label.text = "Luminance: ";
      this.blackSlider.label.minWidth = labelMinWidth;
      this.blackSlider.label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.blackSlider.toolTip = "<p>Increase/Decrease the luminance of the created HDR image before combining it with the original image.</p>";
      this.blackSlider.setRange(-100.0, 100.0);
      this.blackSlider.slider.setRange(-100.0, 100.0);
      this.blackSlider.slider.scaledMinWidth = sliderMinWidth;
      this.blackSlider.setPrecision(2);
      this.blackSlider.setReal(true);
      this.blackSlider.setValue(createHDRParameters.luminance);

      this.blackSlider.onValueUpdated = function(t) {
         this.dialog.previewTimer.stop();
         createHDRParameters.luminance = t;
         this.dialog.previewTimer.start();
      };

      this.resetBlackButton = new ToolButton( this );
      this.resetBlackButton.icon = this.scaledResource( ":/icons/clear-inverted.png" );
      this.resetBlackButton.setScaledFixedSize( 24, 24 );
      this.resetBlackButton.toolTip = "<p>Reset the luminance.</p>";
      this.resetBlackButton.onClick = () => {
         let timerWasRunning = this.dialog.previewTimer.isRunning;
         this.dialog.previewTimer.stop();
         this.dialog.blackSlider.setValue(0.0);
         createHDRParameters.luminance = 0.0;
         if (timerWasRunning) this.dialog.previewTimer.start();
      }

      this.satSlider = new NumericControl(this);
      this.satSlider.label.text = "Saturation: ";
      this.satSlider.label.minWidth = labelMinWidth;
      this.satSlider.label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.satSlider.toolTip = "<p>Increase/Decrease the color saturation of the created HDR image before it will be comined with the original image.</p>";
      this.satSlider.setRange(-100.0, 100.0);
      this.satSlider.slider.setRange(-100.0, 100.0);
      this.satSlider.slider.scaledMinWidth = sliderMinWidth;
      this.satSlider.setPrecision(2);
      this.satSlider.setReal(true);
      this.satSlider.setValue(createHDRParameters.saturation);

      this.satSlider.onValueUpdated = function(t) {
         this.dialog.previewTimer.stop();
         createHDRParameters.saturation = t;
         this.dialog.previewTimer.start();
      };

      this.resetSaturationButton = new ToolButton( this );
      this.resetSaturationButton.icon = this.scaledResource( ":/icons/clear-inverted.png" );
      this.resetSaturationButton.setScaledFixedSize( 24, 24 );
      this.resetSaturationButton.toolTip = "<p>Reset the saturation.</p>";
      this.resetSaturationButton.onClick = () => {
         let timerWasRunning = this.dialog.previewTimer.isRunning;
         this.dialog.previewTimer.stop();
         this.dialog.satSlider.setValue(0.0);
         createHDRParameters.saturation = 0.0;
         if (timerWasRunning) this.dialog.previewTimer.start();
      }

      this.contrastSlider = new NumericControl(this);
      this.contrastSlider.label.text = "Contrast: ";
      this.contrastSlider.label.minWidth = labelMinWidth;
      this.contrastSlider.label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.contrastSlider.toolTip = "<p>Increase/Decrease the contrast of the created HDR image before it will be combined with the original image.</p>";
      this.contrastSlider.setRange(-100.0, 100.0);
      this.contrastSlider.slider.setRange(-100.0, 100.0);
      this.contrastSlider.slider.scaledMinWidth = sliderMinWidth;
      this.contrastSlider.setPrecision(2);
      this.contrastSlider.setReal(true);
      this.contrastSlider.setValue(createHDRParameters.contrast);

      this.contrastSlider.onValueUpdated = function(t) {
         this.dialog.previewTimer.stop();
         createHDRParameters.contrast = t;
         this.dialog.previewTimer.start();
      };

      this.resetContrastButton = new ToolButton( this );
      this.resetContrastButton.icon = this.scaledResource( ":/icons/clear-inverted.png" );
      this.resetContrastButton.setScaledFixedSize( 24, 24 );
      this.resetContrastButton.toolTip = "<p>Reset the contrast.</p>";
      this.resetContrastButton.onClick = () => {
         let timerWasRunning = this.dialog.previewTimer.isRunning;
         this.dialog.previewTimer.stop();
         this.dialog.contrastSlider.setValue(0.0);
         createHDRParameters.contrast = 0.0;
         if (timerWasRunning) this.dialog.previewTimer.start();
      }

      this.lumSatControl.sizer = new VerticalSizer();
      this.lumSatControl.backgroundColor = 0xFFD8D7D3;

      this.lumSatControl.sizer.margin = 6;
      this.blackSizer = new HorizontalSizer();
      this.blackSizer.add(this.blackSlider);
      this.blackSizer.add(this.resetBlackButton);
      this.lumSatControl.sizer.add(this.blackSizer);
      this.lumSatControl.sizer.addSpacing(4);

      this.satSizer = new HorizontalSizer();
      this.satSizer.add(this.satSlider);
      this.satSizer.add(this.resetSaturationButton);
      this.lumSatControl.sizer.add(this.satSizer);

      this.contrastSizer = new HorizontalSizer();
      this.contrastSizer.add(this.contrastSlider);
      this.contrastSizer.add(this.resetContrastButton);
      this.lumSatControl.sizer.add(this.contrastSizer);

      this.buttonFrame = new Frame;
      this.buttonFrame.scaledMinWidth = LEFTWIDTH;
      this.buttonFrame.scaledMaxWidth = LEFTWIDTH;
      this.buttonFrame.sizer = new HorizontalSizer;
      this.buttonFrame.sizer.margin = 6;
      this.buttonFrame.sizer.spacing = 6;

      this.newInstanceButton = new ToolButton( this );
      this.newInstanceButton.icon = this.scaledResource( ":/process-interface/new-instance.png" );
      this.newInstanceButton.setScaledFixedSize( 24, 24 );
      this.newInstanceButton.onMousePress = () => {
         createHDRParameters.save();
         this.newInstance();
      }

      this.ok_Button = new ToolButton( this );
      this.ok_Button.icon = this.scaledResource( ":/process-interface/execute.png" );
      this.ok_Button.setScaledFixedSize( 24, 24 );
      this.ok_Button.toolTip = "<p>Change the target view image using the specified parameters.</p>";
      this.ok_Button.onClick = () => {

         this.dialog.previewTimer.stop();
         if (this.dialog.busy) return;

         this.ok();
         createHDRParameters.replaceImage = this.replaceImage.checked;
         createHDRParameters.save();
         process();
      };

      this.cancel_Button = new ToolButton( this );
      this.cancel_Button.icon = this.scaledResource( ":/process-interface/cancel.png" );
      this.cancel_Button.setScaledFixedSize( 24, 24 );
      this.cancel_Button.toolTip = "<p>Close this dialog with no changes.</p>";
      this.cancel_Button.onClick = () => {
         this.dialog.previewTimer.stop();
         if (this.dialog.busy) return;
         this.cancel();
      };

      this.help_Button = new ToolButton( this );
      this.help_Button.icon = this.scaledResource(":/process-interface/browse-documentation.png");
      this.help_Button.setScaledFixedSize( 24, 24 );
      this.help_Button.toolTip = "<p>Shows the script documentation.</p>";
      this.help_Button.onClick = () => {
         let timerWasRunning = this.dialog.previewTimer.isRunning;
         this.dialog.previewTimer.stop();
         Dialog.browseScriptDocumentation("CreateHDRImage");
         if (timerWasRunning) this.dialog.previewTimer.start();
      };

      this.buttonFrame.sizer.add( this.newInstanceButton );
      this.buttonFrame.sizer.addStretch();
      this.buttonFrame.sizer.add( this.ok_Button );
      this.buttonFrame.sizer.addStretch();

      this.buttonFrame.sizer.add( this.help_Button );
      this.buttonFrame.sizer.addStretch();
      this.buttonFrame.sizer.add( this.cancel_Button );

      this.previewControl = new PreviewControl(this);
      this.previewControl.scaledMinWidth = 800;
      this.previewControl.minHeight = 600;

      // layout the dialog
      this.sizerLeft = new VerticalSizer;
      this.sizerLeft.add(this.helpLabel);

      this.sizerLeft.addSpacing(12);
      this.sizerLeft.add(this.imageGroup);
      this.sizerLeft.addSpacing(16);
      this.sizerLeft.add(this.controlBar);
      this.sizerLeft.add(this.controlControl);
      this.sizerLeft.addSpacing(16);
      this.sizerLeft.add(this.lumSatBar);
      this.sizerLeft.add(this.lumSatControl);

      this.sizerLeft.addStretch();
      this.sizerLeft.add(this.buttonFrame);

      this.sizer = new HorizontalSizer;
      this.sizer.margin = 8;
      this.sizer.spacing = 6;
      this.sizer.add(this.sizerLeft);
      this.sizer.add(this.previewControl);

      this.previewTimer = new Timer();
      this.previewTimer.interval = 0.50;
      this.previewTimer.periodic = true;
      this.previewTimer.dialog = this;
      this.previewTimer.busy = false;
      this.previewTimer.previewKey = "";
      this.previewTimer.updateCount = 0;
      this.previewTimer.updatePreview = true;

      this.previewTimer.onTimeout = function()  {
         let currentPreviewKey = getPreviewKey();
         let needsUpdate = (this.previewKey != currentPreviewKey);

         if (needsUpdate)
         {
            if (this.busy) return;

            if (!this.dialog.previewTimer.updatePreview)
               return;

            this.dialog.imageViewSelector.enabled = false;
            this.dialog.maskViewSelector.enabled = false;
            this.dialog.ok_Button.enabled = false;
            this.dialog.cancel_Button.enabled = false;
            this.stop();
            this.busy = true;
            this.dialog.cursor = new Cursor(StdCursor.Wait);

            try {
               processPreview();

               if (createHDRParameters.previewImage) {
                  let previewImage = createHDRParameters.previewImage;
                  var metadata = {
                     width: previewImage.width,
                     height: previewImage.height
                  }

                  this.dialog.previewControl.SetPreview(previewImage, createHDRParameters.image, metadata);
                  this.dialog.previewControl.forceRedraw();
               }
            }
            catch(error) {
               Console.critical(error);
            }
            finally {

               this.previewKey = currentPreviewKey;

               this.busy = false;
               this.dialog.imageViewSelector.enabled = true;
               this.dialog.maskViewSelector.enabled = true;
               this.dialog.ok_Button.enabled = true;
               this.dialog.cancel_Button.enabled = true;

               if (createHDRParameters.useMedianTransform)
                  this.dialog.previewTimer.updatePreview = false;

               this.dialog.cursor = new Cursor(StdCursor.Arrow);

               this.start();
            }
         }

      }

      if (createHDRParameters.image) {
         this.imageViewSelector.currentView = createHDRParameters.image;

         if (createHDRParameters.previewImage) {
            createHDRParameters.previewImage.free();
         }

         createHDRParameters.previewImage = undefined;
         var previewImage = new Image(createHDRParameters.image.image);

         this.dialog.maskViewSelector.enabled = true;

         var metadata = {
            width: previewImage.width,
            height: previewImage.height
         }

         this.dialog.previewControl.SetPreview(previewImage, createHDRParameters.image, metadata);
         this.dialog.previewControl.zoomToFit();
         createHDRParameters.previewImage = previewImage;
         this.dialog.previewTimer.previewKey = "0";
         this.dialog.previewTimer.start();
      }

      this.onHide = function() {
         this.dialog.previewTimer.stop();

         if (createHDRParameters.previewImage) {
            createHDRParameters.previewImage.free();
         }
      }
   }
}

function main() {

   // Was the script started from a process icon?
   if (Parameters.isViewTarget) {

      // Load all parameters stored in the process icon.
      createHDRParameters.load();

      // Use the image the process icon was dropped onto
      // as the selected target image.
      createHDRParameters.image = Parameters.targetView;

   }
   else if (Parameters.isGlobalTarget) {

      // Process icon launched globally:
      // load the parameters stored in the icon.
      createHDRParameters.load();

   }
   else {

      // Normal script launch:
      // use the currently active image, if one exists.
      var window = ImageWindow.activeWindow;

      if (!window.isNull) {
         createHDRParameters.image = window.mainView;
      }

   }

   // Always open the normal GUI.
   let dialog = new CreateHDRImageDialog();
   dialog.execute();
}

main();
