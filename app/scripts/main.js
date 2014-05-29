var fs = require('fs');
var RayTracer = require('crp-raytracer');

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

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
            "token": "5b199d2e-f752-47a1-95eb-93878f589be4"
        }
    });

    rayTracer.on('run', function(result) {
        canvas.width = result.width;
        canvas.height =  result.height;
        canvasImageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
    });

    var needUpdate = false;
    var throtle = 20;
    var draw = function() {
        if(needUpdate && throtle-- < 0) {
            canvasContext.putImageData(canvasImageData, 0, 0);
            needUpdate = false;
            throtle = 20;
        }
        requestAnimationFrame(draw);
    };
    window.requestAnimationFrame(draw);

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
        needUpdate = true;
    });

    rayTracer.on('end', function() {
        if(onEnd != null) {
            onEnd();
        }
    });
    
    rayTracer.run();
}

var worker;

function runLocal(input, onEnd) {

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

    var needUpdate = false;
    var throtle = 20;
    var draw = function() {
        if(needUpdate && throtle-- < 0) {
            canvasContext.putImageData(canvasImageData, 0, 0);
            needUpdate = false;
            throtle = 20;
        }
        requestAnimationFrame(draw);
    };
    window.requestAnimationFrame(draw);

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
            needUpdate = true;
        } else if (msg.data[0] === 'resize') {
            canvas.width = msg.data[1].W;
            canvas.height = msg.data[1].H;
            canvasImageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
        } else if (msg.data[0] === 'end') {
            if(onEnd != null) {
                onEnd();
            }
        }
    };
}

var editor;
var tasks = 8;

$(function() {

  editor = CodeMirror.fromTextArea($('#input')[0], { lineNumbers: true });

  $("#number").val(Math.pow(tasks, 2));
  $("#slider" ).slider({
    range: "min",
    value: tasks,
    min: 1,
    max: 15,
    step: 1,
    slide: function( event, ui ) {
      tasks = ui.value;
      $("#number").val(Math.pow(tasks, 2));
    }
  });

  $("#selection img:first-child").trigger("click");

});

/*
 * Compare
 */

var timerTracer;
var timerLocal;

var stopTracer = function() {
    clearInterval(timerTracer);
};

var stopLocal = function() {
    clearInterval(timerLocal);
};

$('#run').click(function() {
    stopTracer();
    stopLocal();

    var input = fs.readFileSync(__dirname + "/../scenes/pokeball.rt", 'utf8');
    // Start Counter
    var timeTracer = 0;
    timerTracer = setInterval(function() {
        timeTracer++;
        $('#time-tracer').html(timeTracer + 's');
    }, 1000);
    
    var timeLocal = 0;
    timerLocal = setInterval(function() {
        timeLocal++;
        $('#time-local').html(timeLocal + 's');
    }, 1000);
    
    // Run raytracer
    try {
        runRayTracer(input, 8, '#canvas-tracer', stopTracer);
        runLocal(input, stopLocal);
    } catch(e) {
        console.log(e);
        stopTracer();
        stopLocal();
    }

});

$('#selection img').click(function() {
  var title = $(this).attr('title');
  $.get('examples/' + title + '.rt', function(file) {
      editor.setValue(file.trim());
  });
});

$('#run-try').click(function() {
  $('#run-try').attr("disabled", true);
  $('#save').attr("disabled", true);
  // Start Counter
  var time = 0;
  var timer = setInterval(function() {
    time++;
    $('#time-try').html(time + 's');
  }, 1000);
  var stop = function() {
    clearInterval(timer);
    $('#run-try').attr("disabled", false);
    $('#save').attr("disabled", false);
  };
  // Run raytracer
  try {
    runRayTracer(editor.getValue(), tasks, '#canvas-try', stop);
  } catch(e) {
    console.log(e);
    stop();
  }
  
});

$('#save').click(function() {
  window.open($("#canvas-try").get(0).toDataURL("image/png"));
});
