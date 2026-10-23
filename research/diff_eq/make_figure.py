from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

B=Path(__file__).resolve().parent
r=json.loads((B/'results.json').read_text(encoding='utf8'))
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False})
fig,ax=plt.subplots(1,2,figsize=(9.2,3.8),layout='constrained')
for mode,style in [('M','o-'),('A','s--')]:
    v=[x for x in r['conditioning'] if x['mode']==mode]
    ax[0].loglog([x['h'] for x in v],[x['rest_sigma_min'] for x in v],style,color='black',
                markerfacecolor='white' if mode=='A' else 'black',label=mode,linewidth=1.3,markersize=4)
ax[0].set_xlabel('Интервал h')
ax[0].set_ylabel('Наименьшее сингулярное число')
ax[0].set_title('а  Калибровка первого компонента',fontsize=10)
ax[0].legend(frameon=False,title='Режим')
v=r['transfer_excitation']
ax[1].loglog([x['lambda1'] for x in v],[x['sigma_min'] for x in v],'o-',color='black',linewidth=1.3,markersize=4)
ax[1].set_xlabel('Коэффициент забывания λ₁')
ax[1].set_ylabel('Наименьшее сингулярное число')
ax[1].set_title('б  Разделение освоения и переноса',fontsize=10)
for a in ax:a.grid(True,which='major',color='.85',linewidth=.6)
fig.savefig(B/'conditioning.png',dpi=300)
fig.savefig(B/'conditioning.eps',format='eps')
plt.close(fig)

