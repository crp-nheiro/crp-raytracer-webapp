
module.exports = CrowdProcess;

function CrowdProcess(token, program, data, onData, onError) {
    var token;

    createJob(program, function(jobId) {
        createTasks(jobId, function() {
            getResults(onData);
        });
    });

    function createJob(program, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.crowdprocess.com/jobs', true);
        xhr.setRequestHeader("Authorization:", "Token " + token);

        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.status == 200) {
                var res = JSON.parse(xhr.responseText);
                if(cb) {
                    cb(res);
                }
            }
        };
        xhr.onerror = function(error) {
            console.error(xhr.statusText);
            if(onError) {
                onError(error);
            }
        };
        xhr.send({
            "program": program
        });
    }

    function createTasks(jobId, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.crowdprocess.com/jobs/' + jobId + '/tasks', true);
        xhr.setRequestHeader("Authorization:", "Token " + token);

        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.status == 200) {
                var res = JSON.parse(xhr.responseText);
                if(cb) {
                    cb();
                }
            }
        };
        xhr.onerror = function(error) {
            console.error(xhr.statusText);
            if(onError) {
                onError(error);
            }
        };
        xhr.send(data);
    }

    function getResults(cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/stream');
        xhr.seenBytes = 0;

        xhr.onreadystatechange = function() {
            if(xhr.readyState > 2) {
                var newData = xhr.responseText.substr(xhr.seenBytes);
                /* process newData */
                xhr.seenBytes = xhr.responseText.length;
            }
        };

        xhr.send();
    }
}