var _earthquakeData;
var _lastDate;
var _playData = {};
var _playSpeed = 70;
var _numVoices = 8;
var _currentTime;
var _lastIndex;
var _clockEl = document.getElementById("clock");
var _context = new webkitAudioContext(); // one context per document
var _canvas = document.getElementById("canvas");
_canvas = _canvas.getContext("2d");

_canvas.beginPath();
_canvas.rect(0, 0, 1080, 620);
_canvas.fillStyle = "#111";
_canvas.fill();
_canvas.closePath();

var _poly = [];

for (var i = 0; i < _numVoices; i++)
{
	var voice = _context.createOscillator();
	voice.type = 1;

	var gain = _context.createGain();
	gain.gain.value = 0;
	var panner = _context.createPanner();

	voice.connect(gain);
	gain.connect(panner);

	panner.connect(_context.destination);
	
	voice.start(0);
	
	_poly.push({ voice: voice, gain: gain, panner: panner });
}

$(document).ready(function() {
	$.getJSON('http://apis.is/earthquake/is', function(data) {
		_earthquakeData = data;
		setup();
	});
});

function setup()
{
	_earthquakeData = _earthquakeData.results;

	var startPos = Math.floor(_earthquakeData.length / 2);
	var startTime = new Date(_earthquakeData[startPos]["timestamp"]);

	_lastIndex = startPos;
	_currentTime = +startTime / 1000;

	for (var i = _earthquakeData.length-1; i > 0; i--)
	{
		var date = +new Date(_earthquakeData[i]["timestamp"]) / 1000;
		_playData[date] = _earthquakeData[i];
		_lastDate = date;
	}

	setInterval(tick, 220);
}

var currentVoice = 0;

function playEarthquakesBetween(start, end)
{
	
	for(var i = start; i < end; i++)
	{
		var _quakeForCurrentSecond = _playData[i];

		if(_quakeForCurrentSecond !== undefined)
		{
			playEarthquakeSound(_quakeForCurrentSecond.depth,
				_quakeForCurrentSecond.size,
				_quakeForCurrentSecond.latitude,
				_quakeForCurrentSecond.longitude,
				currentVoice++);
			currentVoice = currentVoice % _numVoices;
			_clockEl.innerHTML = "" + new Date(start*1000) + "<br><span class='location'>" + _quakeForCurrentSecond.humanReadableLocation + "</span>";
		}
	}
}

function snapToScale(note, scale)
{
	var noteInScale = note % 12;
	var offset = note - noteInScale;
	scale.push(scale[0] + 12);
	for(var i = 0; i < scale.length-1; i++)
	{
		if (noteInScale == scale[i]) return noteInScale + offset;
		if (noteInScale > scale[i] && noteInScale < scale[i+1])
		{
			if((noteInScale - scale[i]) > (scale[i+1] - noteInScale))
			{
				return scale[i] + offset;
			}
			else
			{
				return scale[i+1] + offset;
			}
		}
	}
}

function playEarthquakeSound(depth, scale, lat, lon, voice)
{
	var pan = {x: (lon + 17) * 5, y: 0.0, z: (lat - 64.5)*5};

	var musicScale = [0, 2, 4, 7, 10, 11];

	var transpose = voice % 2 == 0 ? 0 : 12;
	playHerzWithReleaseForVoice(midiToFreq(snapToScale(60 + Math.floor(-depth + transpose)*2, musicScale)), Math.abs(scale/3), voice, pan);

	_canvas.beginPath();

	_canvas.arc( 540 + 4*540*(lon + 17), 160 + 4*310*(lat - 64.5), Math.abs(scale * 5), 0, Math.PI * 2 );
	_canvas.fillStyle = 'rgba(160, 220, 80, ' + (7.0 - depth) / 7.0 + ')';
	_canvas.fill();
	_canvas.closePath();

	//console.log("Play earthquake: ", (lon + 17), (lat - 64.5), voice);
}

function playHerzWithReleaseForVoice(herz, release, voice, pan)
{
	now = _context.currentTime;
	_poly[voice].voice.frequency.setValueAtTime(herz, now);
	_poly[voice].gain.gain.setValueAtTime(0, now);
	_poly[voice].gain.gain.linearRampToValueAtTime(0.4, now + 0.001);
	_poly[voice].gain.gain.linearRampToValueAtTime(0.0, now + 0.001 + 1.1*release);
	_poly[voice].panner.setPosition(pan.x, pan.y, pan.z);
}

function midiToFreq(midi)
{
	return 27.5 * Math.pow(2, ((midi - 21) / 12));
}

function tick()
{
	if (_currentTime > _lastDate)
	{
		_currentTime = (+new Date(_earthquakeData[_earthquakeData.length-1]["timestamp"])) / 1000;
	}

	var nextTime = _currentTime + _playSpeed;
	playEarthquakesBetween(_currentTime, nextTime);
	_currentTime = nextTime;
}
