var fs = require('fs');
var RayTracer = require('crp-raytracer');

function runRayTracer(input) {

  var canvas = $('#canvas-tracer').get(0);
  var canvasContext = canvas.getContext("2d");
  var canvasImageData;
  
  /* Clear canvas */
  canvas.width = canvas.width;

  var t = +new Date();

  var rayTracer = new RayTracer({
    split: 10,
    input: input,
    credentials: {
      "token": "19575cb6-5ec2-4143-865a-71d26813f0da"
    },
    //mock: true
  });
 
  rayTracer.on('run', function(result) {
    canvas.width = result.width;
    canvas.height =  result.height;
    canvasImageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
  });

  rayTracer.on('data', function(result) {
    console.log("onData!");
    var i = 0;
    for(var y = result.begin_y; y < result.end_y; y++) {
        for(var x = result.begin_x; x < result.end_x; x++) {
          var index = (x * canvas.width + y) * 4;
          canvasImageData.data[index] = result.data[i++];
          canvasImageData.data[index+1] = result.data[i++];
          canvasImageData.data[index+2] = result.data[i++];
          canvasImageData.data[index+3] = 255;
        }
    }
    canvasContext.putImageData(canvasImageData, 0, 0);
    /* Update counter */
    $('#time-tracer').html(Math.round((+new Date() - t) / 1000) + 's');
  });

  rayTracer.on('end', function(result) {
    //crpCanvasContext.putImageData(crpImageData, 0, 0);
  });

  rayTracer.run();
}

var worker;

function runLocal(input) {

  var canvas = $('#canvas-local').get(0);
  var canvasContext = canvas.getContext("2d");
  var canvasImageData;

  /* Clear canvas */
  canvas.width = canvas.width;

  /* Run Worker */
  if(worker) {
    worker.terminate();
  }
  worker = new Worker('scripts/worker/worker.js');
  worker.postMessage([
    'process', {
      input: input,
    }
  ]);

  var t = +new Date();

  worker.onmessage = function(msg) {    
    if(msg.data[0] === 'result') {
      var y = msg.data[1];
      var idxMsg = 2;
      for(var x = 0; x < canvas.width; x++) {
        var index = (y * canvas.width + x) * 4;
        canvasImageData.data[index++] = msg.data[idxMsg++];
        canvasImageData.data[index++] = msg.data[idxMsg++];
        canvasImageData.data[index++] = msg.data[idxMsg++];
        canvasImageData.data[index++] = 255;
      }
      canvasContext.putImageData(canvasImageData, 0, 0);
      /* Update counter */
      $('#time-local').html(Math.round((+new Date() - t) / 1000) + 's');
    } else if (msg.data[0] === 'resize') {
      canvas.width = msg.data[1].W;
      canvas.height = msg.data[1].H;
      canvasImageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
//    return $('#save').show();
    }
  };

}


$('#run').click(function() {
  var input = fs.readFileSync(__dirname + "/../scenes/pokeball.rt", 'utf8');
  runRayTracer(input);
  runLocal(input);
});
