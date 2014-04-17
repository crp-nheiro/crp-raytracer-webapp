var fs = require('fs');
var RayTracer = require('crp-raytracer');

function runRayTracer(input, tasks, canvasSelector, onEnd) {

  var canvas = $(canvasSelector).get(0);
  var canvasContext = canvas.getContext("2d");
  var canvasImageData;
  
  /* Clear canvas */
  canvas.width = canvas.width;

  var rayTracer = new RayTracer({
    split: tasks,
    input: input,
    credentials: {
      "token": "d41337aa-2f11-46e4-8a51-7141e6e84490"
    }
  });
 
  rayTracer.on('run', function(result) {
    canvas.width = result.width;
    canvas.height =  result.height;
    canvasImageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
  });

  rayTracer.on('data', function(result) {
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
  });

  if(onEnd != null) {
    rayTracer.on('end', onEnd);
  }

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
  runRayTracer(input, 10, '#canvas-tracer', '#time-tracer');
  runLocal(input);
});

var editor;
var tasks = 5;

$(function() {

  editor = CodeMirror.fromTextArea($('#input')[0], { lineNumbers: true });

  $("#number").val(Math.pow(tasks, 2));
  $("#slider" ).slider({
    range: "min",
    value: tasks,
    min: 1,
    max: 10,
    step: 1,
    slide: function( event, ui ) {
      tasks = ui.value;
      $("#number").val(Math.pow(tasks, 2));
    }
  });

});

$('#selection img').click(function() {
  var title = $(this).attr('title');
  $.get('examples/' + title + '.rt', function(file) {
      editor.setValue(file.trim());
    });
});

$('#run-try').click(function() {
  $('#run-try').attr("disabled", true);
  // Start Counter
  var time = 0;
  var timer = setInterval(function() {
    time++;
    $('#time-try').html(time + 's');
  }, 1000);
  var stop = function() {
    clearInterval(timer);
    $('#run-try').attr("disabled", false);
  };
  // Run raytracer
  try {
    runRayTracer(editor.getValue(), tasks, '#canvas-try', stop);
  } catch(e) {
    stop();
  }
  
});
