const fs=require('fs');
const s=fs.readFileSync('index.js','utf8');
const lines = s.split(/\r?\n/);
let open=0, lineNo=0, firstMismatch=null;
let maxOpen=0, maxOpenLine=0;
const stack=[];
for(const [i,l] of lines.entries()){
	for(const ch of l){
		if(ch==='{') { open++; stack.push({line:i+1, text:l}); }
		if(ch==='}') { open--; stack.pop(); }
	}
	if(open<0 && firstMismatch===null) firstMismatch=i+1;
	if(open>maxOpen){ maxOpen=open; maxOpenLine=i+1; }
	if(open<0) break;
	lineNo=i+1;
}
console.log('finalOpen',open,'firstMismatchLine',firstMismatch);
console.log('maxOpen',maxOpen,'at line',maxOpenLine);
if(open>0){
	console.log('last 80 lines:\n',lines.slice(-80).join('\n'));
}
if(maxOpenLine){
	const start = Math.max(0, maxOpenLine-12);
	const end = Math.min(lines.length, maxOpenLine+12);
	console.log(`\n--- context around maxOpenLine ${maxOpenLine} (lines ${start+1}-${end}) ---`);
	for(let i=start;i<end;i++){
		const ln = (i+1).toString().padStart(5,' ');
		console.log(ln+': '+lines[i]);
	}
}
if(stack.length>0){
	console.log('\n--- remaining open brace stack (top is last unmatched) ---');
	for(const sitem of stack.slice(-10)){
		console.log('line',sitem.line,':',sitem.text);
	}
}