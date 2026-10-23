from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing,Rect,String,Line,Polygon
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.graphics import renderPDF
from reportlab.lib import colors
import json,math
BASE=Path(__file__).parent
pdfmetrics.registerFont(TTFont('ArticleTimes','C:/Windows/Fonts/times.ttf'))
FONT='ArticleTimes'
def text(d,x,y,s,size=17,anchor='middle'):d.add(String(x,y,s,fontName=FONT,fontSize=size,textAnchor=anchor,fillColor=colors.black))
def arrow(d,x1,y1,x2,y2):
 d.add(Line(x1,y1,x2,y2,strokeColor=colors.black,strokeWidth=1.2));ang=math.atan2(y2-y1,x2-x1)
 d.add(Polygon([x2,y2,x2-8*math.cos(ang-.4),y2-8*math.sin(ang-.4),x2-8*math.cos(ang+.4),y2-8*math.sin(ang+.4)],fillColor=colors.black,strokeColor=colors.black))
d=Drawing(600,410)
boxes=[(10,305,['1 Постановка цели','и исходная диагностика']),
 (320,305,['2 Самостоятельная гипотеза','и план исследования']),
 (320,170,['3 Практика с допустимой','помощью и рефлексия']),
 (10,170,['4 Независимая проверка','исходных предпосылок']),
 (10,35,['5 Пробы переноса','в новый предметный контекст']),
 (320,35,['6 Рекомендация и выбор','следующего учебного действия'])]
for x,y,lines in boxes:
 d.add(Rect(x,y,270,80,strokeColor=colors.black,fillColor=colors.white,strokeWidth=1))
 for i,line in enumerate(lines):text(d,x+135,y+48-i*24,line,17)
for args in [(280,345,320,345),(455,305,455,250),(320,210,280,210),(145,170,145,115),(280,75,320,75)]:arrow(d,*args)
renderPDF.drawToFile(d,str(BASE/'learning_cycle.pdf'))

r=json.loads((BASE/'simulation_results.json').read_text(encoding='utf8'))
d=Drawing(600,350);plot=LinePlot();plot.x=65;plot.y=75;plot.width=510;plot.height=230
plot.data=[[(x['k'],100*x['independent']) for x in r['sensitivity']],[(x['k'],100*x['uncertainty']) for x in r['sensitivity']]]
plot.xValueAxis.valueMin=0;plot.xValueAxis.valueMax=50;plot.xValueAxis.valueSteps=[0,12,24,36,48]
plot.yValueAxis.valueMin=0;plot.yValueAxis.valueMax=100;plot.yValueAxis.valueSteps=[0,20,40,60,80,100]
for axis in [plot.xValueAxis,plot.yValueAxis]:
 axis.labels.fontName=FONT;axis.labels.fontSize=17;axis.strokeColor=colors.black;axis.strokeWidth=1
plot.yValueAxis.visibleGrid=True;plot.yValueAxis.gridStrokeColor=colors.Color(.8,.8,.8);plot.yValueAxis.gridStrokeWidth=.3
for i in [0,1]:
 plot.lines[i].strokeColor=colors.black;plot.lines[i].strokeWidth=1.7;plot.lines[i].symbol=makeMarker('FilledCircle');plot.lines[i].symbol.size=7;plot.lines[i].symbol.fillColor=colors.black;plot.lines[i].symbol.strokeColor=colors.black
plot.lines[1].strokeDashArray=[6,4]
d.add(plot)
text(d,65,326,'Вероятность допуска, %',17,'start')
text(d,330,15,'Независимые семейства k на предпосылку',17)
d.add(Line(345,330,385,330,strokeWidth=1.7));text(d,395,324,'R₁',17,'start')
d.add(Line(450,330,490,330,strokeWidth=1.7,strokeDashArray=[6,4]));text(d,500,324,'R₂',17,'start')
renderPDF.drawToFile(d,str(BASE/'decision_sensitivity.pdf'))
print('Two vector scientific figures saved')
