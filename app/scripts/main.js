'use strict'

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

var fs = require('fs');
// var work = require('webworkify');
var RayTracer = require('crp-raytracer');

var tracerWorker;

function runRayTracer(input, tasks, canvasSelector, onEnd, animation, onFrame) {
    var canvas = $(canvasSelector).get(0);
    var canvasContext = canvas.getContext("2d");
    var canvasImageData = [];
    
    /* Clear canvas */
    canvas.width = canvas.width;

    var currFrame = 0;
    var splitsPerFrame = 0;
    var splits = 0;

    var drawFrame = 0;
    var then = Date.now();
    var delta;

    function draw() {
        var now = Date.now();
        delta = now - then;
        window.requestAnimationFrame(draw);
        if(delta > 1000 / animation.fps) {         
            then = now - (delta % 1000 / animation.fps);
            canvasContext.putImageData(canvasImageData[drawFrame], 0, 0);
            drawFrame = (drawFrame + 1) % animation.frames;
        }
    }

    /* Worker */
    
    if(tracerWorker) {
        tracerWorker.terminate();
    }
    tracerWorker = new Worker('scripts/worker/tracerWorker_out.js'); //  work(require('./worker/tracerWorker.js'));

    tracerWorker.onerror = function(event) {
        console.error(event.message + " (" + event.filename + ":" + event.lineno + ")");
    };

    tracerWorker.onmessage = function(msg) {  
        if(msg.data[0] === 'result') {
            var result = msg.data[1];
            
            var i = 0;
            var frame;
            if(result.animation) {
                frame = result.animation.frame;
            } else {
                frame = 0;
            }
            for(var y = result.begin_y; y < result.end_y; y++) {
                for(var x = result.begin_x; x < result.end_x; x++) {
                    var index = (x * canvas.width + y) * 4;
                    canvasImageData[frame].data[index] = result.data[i++];
                    canvasImageData[frame].data[index+1] = result.data[i++];
                    canvasImageData[frame].data[index+2] = result.data[i++];
                    canvasImageData[frame].data[index+3] = 255;
                }
            }
            if(!result.animation) {
                canvasContext.putImageData(canvasImageData[0], 0, 0);
            }

            splits++;
            if(onFrame) {
                onFrame(splits / splitsPerFrame, animation.frames);

            }

        } else if (msg.data[0] === 'resize') {
            canvas.width = msg.data[1];
            canvas.height = msg.data[2];
            splitsPerFrame = msg.data[3];

            if(currFrame == 0) {
                if(animation) {
                    for(var i = 0; i < animation.frames; i++) {
                        canvasImageData[i] = canvasContext.createImageData(canvas.width, canvas.height);
                    }
                    window.requestAnimationFrame(draw);
                } else {
                    canvasImageData[0] = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
                }
            }
        } else if (msg.data[0] === 'end') {
            if(onEnd != null) {
                onEnd();
            }    
        } else if (msg.data[0] === 'error') {
            console.log("Error:" + msg.data[1]); 
        }
    };

    tracerWorker.postMessage([
        'process', {
            tasks: tasks,
            input: input,
            animation: animation,
        }
    ]);
    

    /*
    var rayTracer = new RayTracer({
        split: tasks,
        input: input,
        animation: animation,
        credentials: {
            "token": "5b199d2e-f752-47a1-95eb-93878f589be4"
        }
    });

    rayTracer.on('run', function(result) {
        canvas.width = result.width;
        canvas.height =  result.height;
        splitsPerFrame = result.splitsPerFrame;

        if(animation) {
            for(var i = 0; i < animation.frames; i++) {
                canvasImageData[i] = canvasContext.createImageData(canvas.width, canvas.height);
            }
            window.requestAnimationFrame(draw);
        } else {
            canvasImageData[0] = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
        }
    });

    rayTracer.on('error', function(error) {
        console.log(error);
    });

    rayTracer.on('data', function(result) {
        var i = 0;
        var frame;
        if(result.animation) {
            frame = result.animation.frame;
        } else {
            frame = 0;
        }
        for(var y = result.begin_y; y < result.end_y; y++) {
            for(var x = result.begin_x; x < result.end_x; x++) {
                var index = (x * canvas.width + y) * 4;
                canvasImageData[frame].data[index] = result.data[i++];
                canvasImageData[frame].data[index+1] = result.data[i++];
                canvasImageData[frame].data[index+2] = result.data[i++];
                canvasImageData[frame].data[index+3] = 255;
            }
        }
        if(!result.animation) {
            canvasContext.putImageData(canvasImageData[0], 0, 0);
        }
        splits++;
        if(onFrame) {
            onFrame(splits / splitsPerFrame, animation.frames);
        }
    });

    rayTracer.on('end', function() {
        if(onEnd != null) {
            onEnd();
        }
    });
    
    rayTracer.run();
    */
}

var worker;

function runLocal(input, onEnd, animation, onFrame) {

    var canvas = $('#canvas-local').get(0);
    var canvasContext = canvas.getContext("2d");
    var canvasImageData = [];

    /* Clear canvas */
    canvas.width = canvas.width;

    var currFrame = 0;

    var drawFrame = 0;
    var then = Date.now();
    var delta;
    function draw() {
        var now = Date.now();
        delta = now - then;
        window.requestAnimationFrame(draw);
        if(delta > 1000 / animation.fps) {         
            then = now - (delta % 1000 / animation.fps);
            canvasContext.putImageData(canvasImageData[drawFrame], 0, 0);
            drawFrame = (drawFrame + 1) % animation.frames;
        }
    }

    /* Worker */

    if(worker) {
        worker.terminate();
    }
    worker = new Worker('scripts/worker/worker.js');
    worker.onmessage = function(msg) {    
        if(msg.data[0] === 'result') {
            var y = msg.data[1];
            var idxMsg = 2;
            for(var x = 0; x < canvas.width; x++) {
                var index = (y * canvas.width + x) * 4;
                canvasImageData[currFrame].data[index++] = msg.data[idxMsg++];
                canvasImageData[currFrame].data[index++] = msg.data[idxMsg++];
                canvasImageData[currFrame].data[index++] = msg.data[idxMsg++];
                canvasImageData[currFrame].data[index++] = 255;
            }
            canvasContext.putImageData(canvasImageData[currFrame], 0, 0);     
        } else if (msg.data[0] === 'resize') {
            canvas.width = msg.data[1].W;
            canvas.height = msg.data[1].H;
            if(currFrame == 0) {
                if(animation) {
                    for(var i = 0; i < animation.frames; i++) {
                        canvasImageData[i] = canvasContext.createImageData(canvas.width, canvas.height);
                    }
                } else {
                    canvasImageData[0] = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
                }
            }
        } else if (msg.data[0] === 'end') {
            currFrame++;
            if(currFrame < animation.frames) {
                worker.postMessage([
                    'process', {
                        input: input,
                        animation: {
                            frame: currFrame,
                            frames: animation.frames
                        }
                    }
                ]);
                if(onFrame) {
                    onFrame(currFrame, animation.frames);
                } 
            } else {
                window.requestAnimationFrame(draw);
                if(onEnd != null) {
                    onEnd();
                }
            }    
        }
    };

    worker.postMessage([
        'process', {
            input: input,
            animation: {
                frame: currFrame,
                frames: animation.frames
            }
        }
    ]);

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
var timeTracer = 0;
var frameTracer = 0;

var timerLocal;
var timeLocal = 0;
var frameLocal = 0;

var stopTracer = function() {
    clearInterval(timerTracer);
};

var stopLocal = function() {
    clearInterval(timerLocal);
};

var onTracerFrame = function(frame, totalFrames) {
    frameTracer = frame;
}

var onLocalFrame = function(frame, totalFrames) {
    frameLocal = frame;
}

$('#run').click(function() {
    stopTracer();
    stopLocal();

    var input = fs.readFileSync(__dirname + "/../scenes/pokeball.rt", 'utf8');
    // Start Counter

    timeTracer = 0;
    timerTracer = setInterval(function() {
        timeTracer++;
        $('#time-tracer').html(timeTracer + 's');
        $('#frames-tracer').html(frameTracer.toFixed(2) + ' frames');
        if(timeTracer == 0) {
            $('#fps-tracer').html('0 fps');
        } else {
            $('#fps-tracer').html((frameTracer / timeTracer).toFixed(2) + ' fps');
        }
    }, 1000);
    
    timeLocal = 0;
    timerLocal = setInterval(function() {
        timeLocal++;
        $('#time-local').html(timeLocal + 's');
        $('#frames-local').html(frameLocal + ' frames');
        if(timeLocal == 0) {
            $('#fps-local').html('0 fps');
        } else {
            $('#fps-local').html((frameLocal / timeLocal).toFixed(2) + ' fps');
        }
    }, 1000);
    
    var animation = {
        fps: 50,
        frames: 100
    }

    // Run raytracer
    try {
        runRayTracer(input, 6, '#canvas-tracer', stopTracer, animation, onTracerFrame);
        runLocal(input, stopLocal, animation, onLocalFrame);
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
