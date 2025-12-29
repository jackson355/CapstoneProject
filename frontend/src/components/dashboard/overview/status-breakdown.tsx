'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import type { SxProps } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ApexOptions } from 'apexcharts';

import { Chart } from '@/components/core/chart';

export interface StatusBreakdownProps {
  title: string;
  chartSeries: number[];
  labels: string[];
  colors?: string[];
  sx?: SxProps;
}

export function StatusBreakdown({ title, chartSeries, labels, colors, sx }: StatusBreakdownProps): React.JSX.Element {
  const theme = useTheme();
  const chartOptions = useChartOptions(labels, colors);

  // Use provided colors or default theme colors
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
  ];
  const displayColors = colors || defaultColors;

  const total = chartSeries.reduce((sum, value) => sum + value, 0);

  return (
    <Card sx={sx}>
      <CardHeader title={title} />
      <CardContent>
        <Stack spacing={2}>
          {total === 0 ? (
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <Typography color="text.secondary" variant="body2">
                No data available
              </Typography>
            </Stack>
          ) : (
            <>
              <Chart height={300} options={chartOptions} series={chartSeries} type="donut" width="100%" />
              <Stack spacing={1}>
                {chartSeries.map((value, index) => {
                  const label = labels[index];
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

                  return (
                    <Stack
                      key={label}
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: displayColors[index],
                          }}
                        />
                        <Typography variant="body2">{label}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {value} ({percentage}%)
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function useChartOptions(labels: string[], colors?: string[]): ApexOptions {
  const theme = useTheme();

  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
  ];

  return {
    chart: { background: 'transparent' },
    colors: colors || defaultColors,
    dataLabels: { enabled: false },
    labels,
    legend: { show: false },
    plotOptions: { pie: { expandOnClick: false, donut: { size: '60%' } } },
    states: { active: { filter: { type: 'none' } }, hover: { filter: { type: 'none' } } },
    stroke: { width: 0 },
    theme: { mode: theme.palette.mode },
    tooltip: { fillSeriesColor: false },
  };
}
