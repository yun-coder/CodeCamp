type ChartMessage = {
  type?: string;
  data?: {
    chartID?: string;
    chartType?: string;
    chartData?: any;
  };
};

const asChartQueue = (charts: any): ChartMessage[] => {
  return Array.isArray(charts?.MsgQueue) ? charts.MsgQueue : [];
};

const getNumericBulletText = (type: string, index: number) => {
  switch (type) {
    case 'arabicPeriod':
      return `${index}. `;
    case 'arabicParenR':
      return `${index}) `;
    case 'alphaLcParenR':
      return `${String.fromCharCode(index + 96)}) `;
    case 'alphaLcPeriod':
      return `${String.fromCharCode(index + 96)}. `;
    case 'alphaUcParenR':
      return `${String.fromCharCode(index + 64)}) `;
    case 'alphaUcPeriod':
      return `${String.fromCharCode(index + 64)}. `;
    default:
      return String(index);
  }
};

const restoreNumericBullets = (root: ParentNode) => {
  const scopes = [
    ...Array.from(root.querySelectorAll('.block')),
    ...Array.from(root.querySelectorAll('table td')),
  ];

  for (const scope of scopes) {
    const bullets = Array.from(scope.querySelectorAll<HTMLElement>('.numeric-bullet-style'));
    const counters = new Map<string, number>();

    for (const bullet of bullets) {
      const type = String(bullet.dataset.bulltname || 'arabicPeriod');
      const level = String(bullet.dataset.bulltlvl || '0');
      const key = `${level}:${type}`;
      const nextIndex = (counters.get(key) || 0) + 1;
      counters.set(key, nextIndex);
      bullet.textContent = getNumericBulletText(type, nextIndex);
    }
  }
};

const renderChart = async (message: ChartMessage) => {
  const payload = message.data;
  if (!payload?.chartID || !payload.chartType || !payload.chartData) {
    return;
  }

  const billboard = await import('billboard.js') as any;
  const d3Format = await import('d3-format');
  const bb = billboard.default || billboard;
  const { area, bar, line, pie, scatter } = billboard;
  const chart: Record<string, any> = {
    bindto: `#${payload.chartID}`,
  };
  const chartData = payload.chartData;
  const axis = {
    x: {
      tick: {
        format(index: number) {
          return chartData[0]?.xlabels?.[index] || index;
        },
      },
    },
  };

  switch (payload.chartType) {
    case 'lineChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map((item: any) => [item.key, ...item.values.map(({ y }: any) => y)]),
          type: line(),
        },
        axis,
        interaction: { enabled: true },
      });
      break;
    case 'barChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map((item: any) => [item.key, ...item.values.map(({ y }: any) => y)]),
          type: bar(),
        },
        axis: {
          x: {
            tick: {
              multiline: true,
              format(index: number) {
                return chartData[0]?.xlabels?.[index] || index;
              },
            },
          },
        },
      });
      break;
    case 'pieChart':
    case 'pie3DChart':
      Object.assign(chart, {
        data: {
          columns: Object.values(chartData[0]?.xlabels || {}).map((value, index) => [
            value,
            chartData[0]?.values?.[index]?.y,
          ]),
          type: pie(),
        },
      });
      break;
    case 'areaChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map((item: any) => [item.key, ...item.values.map(({ y }: any) => y)]),
          type: area(),
        },
        axis,
        interaction: { enabled: true },
      });
      break;
    case 'scatterChart':
      Object.assign(chart, {
        data: {
          xs: { y: 'x' },
          columns: chartData.map((item: any, index: number) => [index ? 'y' : 'x', ...item]),
          type: scatter(),
        },
        axis: {
          x: {
            label: 'X',
            showDist: true,
            tick: {
              format: d3Format.format('.02f'),
            },
          },
          y: {
            label: 'Y',
            showDist: true,
            tick: {
              format: d3Format.format('.02f'),
            },
          },
        },
      });
      break;
    default:
      return;
  }

  if (chart.data) {
    bb.generate(chart);
  }
};

export const renderPptxPostProcessing = async (charts: unknown, root: ParentNode) => {
  restoreNumericBullets(root);

  const queue = asChartQueue(charts);
  if (!queue.length) {
    return;
  }

  try {
    await Promise.all(queue.map(renderChart));
  } catch (error) {
    console.warn('PPTX chart rendering skipped:', error);
  }
};
