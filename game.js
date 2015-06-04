function resize() {
	var w = Math.min(window.innerWidth,window.innerHeight);
	if(w>=48*12) {
		var size = '48px';
	} else {
		size = w/12;
	}
	$('html').css('font-size',size);
}
$(window).on('resize',resize);
resize();

// random integer between start and (inclusive)
function randrange(start,end) {
	var d = end+1-start;
	return start+Math.floor(Math.random()*d);
}

function factorial(n) {
	var t = 1;
	for(var i=2;i<n;i++) {
		t *= i;
	}
	return t;
}
function format_number(n) {
	if(typeof(n)!='number') {
		return n;
	}
	if(n<0) {
		return '-'+format_number(-n);
	}
	if(n%1!=0) {
		return format_number(Math.floor(n))+'.'+(n%1).toString().slice(2);
	}
	var t = n+'';
	var o = '';
	for(var i=0;i<t.length;i+=3) {
		o=t.slice(t.length-i,t.length-i+3)+(o.length ? ',' : '')+o;
	}
	return t.slice(0,3-i%t.length)+(o.length?',':'')+o;
}

function key_sort(key) {
	return function(a,b) {
		a = a[key];
		b = b[key];
		return a>b ? 1 : a<b ? -1 : 0;
	}
}
var by_value = key_sort('value');

function GameDisplay(game) {
	resize();
	this.game = game;
	var html = this.html = $('#game');
	html.removeClass('end');
	var grid = html.find('#grid');
	grid.html('');
	for(var y=0;y<this.game.height;y++) {
		var tr = document.createElement('tr');
		for(var x=0;x<this.game.width;x++) {
			var td = document.createElement('td');
			$(tr).append(td);
		}
		grid.append(tr);
	}
	$('#hoof').on('click',function() { game.hoof(); });
	html.on('new-block',function(e,block) {
		var html = $('<div class="block">').html(block.value);
		html.on('click',function() {game.click_block(block);});
		grid.find('tr').eq(block.y).find('td').eq(block.x).html(html);
	});
	html.on('block-clicked',function(e,block) {
		var html = grid.find('tr').eq(block.y).find('td').eq(block.x).find('.block')
		html.toggleClass('clicked',block.clicked);
	});
	html.on('can-hoof',function(e,data) {
		var can_hoof = data!==false;
		html.toggleClass('can-hoof',can_hoof);
		html.toggleClass('run',data.run===true);
		html.toggleClass('next-level',data.next_level===true);
		stage_diff($('.score'),can_hoof ? data.score : null);
		stage_diff($('.moves'),can_hoof ? data.moves : null);
		stage_diff($('.level'),can_hoof && data.next_level ? 1 : null);
		$('#hoof').attr('disabled',!can_hoof);
	});

	html.on('level',function(e,level) {
		$('#level').text(format_number(level));
	});

	html.on('next-level',function(e,level) {
		change_diff($('.level'));
	});

	html.on('set-score',function(e,score) {
		$('#score').text(format_number(score));
	});
	html.on('add-score',function(e,diff) {
		if(diff!=0) {
			change_diff($('.score'),diff);
		}
	})
	html.on('set-moves',function(e,moves) {
		$('#moves').text(format_number(moves));
	});
	html.on('add-moves',function(e,moves) {
		change_diff($('.moves'));
	});

	html.on('end',function(e,data) {
		html.addClass('end');
		$('#final-score').html(format_number(data.score));
	});
	$('#restart').on('click',init);
}
function change_diff(selector) {
	selector.find('.diff').removeClass('changed');
}
function stage_diff(selector,n) {
	if(n===null) {
		selector.find('.diff').removeClass('changed');
	} else {
		var text = (n>0 ? '+' : '')+format_number(n);
		selector.find('.diff').text(text).addClass('changed');
		selector.find('.diff-container').css('width',selector.find('.diff').width());
	}
}

function Game() {
	var g = this;
	this.width = 5;
	this.height = 5;
	this.cells = [];
	for(var y=0;y<this.height;y++) {
		var row = [];
		for(var x=0;x<this.width;x++) {
			row.push(null);
		}
		this.cells.push(row);
	}

	this.display = new GameDisplay(this);

	for(var y=0;y<this.height;y++) {
		for(var x=0;x<this.height;x++) {
			this.new_block(x,y);
		}
	}
	this.clicked = [];
	this.score = [];

	this.set_level(5);
	this.set_score(0);
	this.set_moves(10);

	this.can_hoof();
}
Game.prototype = {
	level: 5,
	moves: 10,
	ended: false,

	trigger: function(name,data) {
		this.display.html.trigger(name,data);
	},

	set_level: function(level) {
		this.level = level;
		this.trigger('level',this.level);
	},

	set_score: function(score) {
		this.score = score;
		this.trigger('set-score',this.score);
	},

	add_score: function(diff) {
		this.set_score(this.score+diff);
		this.trigger('add-score',diff);
	},

	set_moves: function(moves) {
		this.moves = moves;
		this.trigger('set-moves',this.moves);
		if(moves<=0) {
			this.end();
		}
	},

	end: function() {
		this.ended = true;
		this.trigger('end',{score:this.score});
	},

	add_moves: function(moves) {
		this.set_moves(this.moves+moves);
		this.trigger('add-moves',moves);
	},

	new_block: function(x,y) {
		var value = randrange(1,this.level);
		var block = this.cells[y][x] = new Block(this,value,x,y);
		this.trigger('new-block',block);
	},

	click_block: function(block) {
		block.clicked = !block.clicked;
		if(block.clicked) {
			this.clicked.push(block);
		} else {
			var i = this.clicked.indexOf(block);
			this.clicked.splice(i,1);
		}
		this.trigger('block-clicked',block);

		this.can_hoof();
	},

	can_hoof: function() {
		var data = {};
		var num_blocks = data.num_blocks = this.clicked.length;
		if(num_blocks<3) {
			this.trigger('can-hoof',false);
			return false;
		}
		this.clicked.sort(by_value);
		var values = this.clicked.map(function(b){return b.value;});
		var diff = data.diff = values[1] - values[0];
		for(var i=2;i<num_blocks;i++) {
			if(values[i]-values[i-1]!=diff) {
				this.trigger('can-hoof',false);
				return false;
			}
		}
		var max = data.max = values[num_blocks-1];
		data.score = Math.pow(diff,num_blocks)*max;
		if(max==this.level && diff==1 && max==num_blocks) {	// if selection is the run 1..max
			data.score = Math.pow(max,3);
			data.run = true;
		}
		data.next_level = data.max==this.level;
		this.trigger('can-hoof',data);
		return data;
	},
	hoof: function() {
		var g = this;
		var data = this.can_hoof();
		if(data===false) {
			return;
		}
		this.add_score(data.score);

		if(data.next_level) {
			this.set_level(this.level+1);
			this.trigger('next-level');
			this.add_moves(2);
		} else {
			this.add_moves(-1);
		}

		this.clicked.map(function(block) {
			g.new_block(block.x,block.y);
		});
		this.clicked = [];
		this.can_hoof();
	},
}

function Block(game,value,x,y) {
	var b = this;
	this.game = game;
	this.value = value;
	this.x = x;
	this.y = y;

}
Block.prototype = {
	clicked: false,
}


function init() {
	var game = window.game = new Game();
}

$(document).ready(init);
