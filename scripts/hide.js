
function togglediv(id) {
	var inp = document.getElementsByTagName('div');
	var divs = Array.prototype.slice.call(inp);

	divs.forEach(div => {
		div.style.display = 'none';
	});
	var el = document.getElementById(id);
	el.style.display = 'block';
}

