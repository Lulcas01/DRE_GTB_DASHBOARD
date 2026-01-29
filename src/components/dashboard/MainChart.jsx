import React from 'react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, LabelList, Line } from 'recharts';
import { formatCompact, formatMoney } from '../../utils/formatters';

export const MainChart = ({ data }) => (
  <div className="h-80 md:h-96">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 50, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
        <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={formatCompact} tick={{fill: '#94a3b8', fontSize: 10}} domain={[0, 'auto']} />
        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={formatCompact} tick={{fill: '#94a3b8', fontSize: 10}} domain={[0, 'auto']} />
        
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
          formatter={(value) => formatMoney(value)} 
          labelStyle={{ fontWeight: 'bold', color: '#334155' }} 
        />
        <Legend wrapperStyle={{fontSize: '12px', paddingTop: '20px'}}/>
        
        <Bar yAxisId="left" dataKey="receita_bruta" barSize={60} fill="#93c5fd" radius={[4, 4, 0, 0]} name="Receita">
          <LabelList dataKey="receita_bruta" position="insideTop" offset={10} formatter={formatCompact} style={{ fill: '#000000', fontSize: '11px', fontWeight: 'bold' }} />
        </Bar>
        
        <Line yAxisId="right" type="linear" dataKey="lucro_liquido" stroke="#16a34a" strokeWidth={3} dot={{r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff'}} name="Margem Líquida">
          <LabelList dataKey="lucro_liquido" position="top" offset={20} formatter={formatCompact} style={{ fill: '#16a34a', fontSize: '15px', fontWeight: '900', stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' }} />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);