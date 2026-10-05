type Point={label:string;value:number};
export function SalesChart({data}:{data:Point[]}){
  const width=900,height=210,pad=28,max=Math.max(...data.map(d=>d.value),1);
  const points=data.map((d,i)=>({x:pad+i*((width-pad*2)/(data.length-1)),y:height-pad-(d.value/max)*(height-pad*2),...d}));
  const line=points.map(p=>`${p.x},${p.y}`).join(" ");
  const area=`${pad},${height-pad} ${line} ${width-pad},${height-pad}`;
  return <div className="w-full overflow-hidden"><svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] w-full" role="img" aria-label="Desempenho de vendas dos últimos sete dias"><defs><linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b6df3" stopOpacity=".24"/><stop offset="100%" stopColor="#8b6df3" stopOpacity=".02"/></linearGradient></defs>{[0,1,2,3].map(i=><line key={i} x1={pad} x2={width-pad} y1={pad+i*((height-pad*2)/3)} y2={pad+i*((height-pad*2)/3)} stroke="#eceef4" strokeWidth="1"/>)}<polygon points={area} fill="url(#salesArea)"/><polyline points={line} fill="none" stroke="#8067eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map(p=><g key={p.label}><circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#5977f4" strokeWidth="2.5"/><text x={p.x} y={height-5} textAnchor="middle" fontSize="10" fill="#9297a8">{p.label}</text>{p.value>0&&<text x={p.x} y={p.y-12} textAnchor="middle" fontSize="10" fontWeight="600" fill="#5c6276">{p.value}</text>}</g>)}</svg></div>
}
