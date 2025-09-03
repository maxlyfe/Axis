import { useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';

// Reutilizando as interfaces que já temos
interface Cliente {
    id: number;
    alertas_ativos: boolean;
}
interface Service {
    id: number;
    preco: number;
    prazo_recorrencia_dias?: number;
}
interface Appointment {
    cliente_id: number;
    data_inicio: string;
    servicos_selecionados: { id: number }[];
}

// NOVO: Interface para os dados do gráfico de previsão
export interface ForecastDailyData {
    date: string; // Ex: "01/01"
    clientesPrevistos: number;
    receitaPotencial: number;
}

export const useRecurrenceForecast = (
    clientes: Cliente[], 
    services: Service[], 
    appointments: Appointment[]
) => {
    const { alertDays } = useSettings();

    const forecast = useMemo(() => {
        const clientsWithAlerts = new Set<number>();
        let overdueCount = 0;
        let overdueRevenue = 0;

        // NOVO: Estrutura para os dados diários da previsão (próximos 30 dias)
        const dailyForecastMap = new Map<string, { clientesPrevistos: number; receitaPotencial: number }>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Inicializa o mapa para os próximos 30 dias
        for (let i = 0; i <= 30; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            const dateKey = futureDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            dailyForecastMap.set(dateKey, { clientesPrevistos: 0, receitaPotencial: 0 });
        }

        if (!clientes?.length || !services?.length || !appointments?.length) {
            return { clientsWithAlerts, overdueCount, overdueRevenue, dailyForecastData: [] };
        }

        const recurringServices = services.filter(s => s.prazo_recorrencia_dias && s.prazo_recorrencia_dias > 0);
        
        clientes.forEach(cliente => {
            const clientAppointments = appointments.filter(ag => ag.cliente_id === cliente.id);
            if (!clientAppointments.length) return;

            const latestAppointments = new Map<number, { date: Date, price: number }>();

            // Para cada serviço recorrente, encontramos o último agendamento do cliente
            recurringServices.forEach(service => {
                const lastAppointmentForService = clientAppointments
                    .filter(ag => ag.servicos_selecionados.some(ss => ss.id === service.id))
                    .sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime())[0];

                if (lastAppointmentForService) {
                    latestAppointments.set(service.id, {
                        date: new Date(lastAppointmentForService.data_inicio),
                        price: service.preco
                    });
                }
            });

            if (latestAppointments.size === 0) return;

            let clientNeedsAlert = false;
            
            latestAppointments.forEach((lastApp, serviceId) => {
                const service = recurringServices.find(s => s.id === serviceId);
                if (!service) return;

                const returnDate = new Date(lastApp.date);
                returnDate.setDate(returnDate.getDate() + service.prazo_recorrencia_dias!);
                returnDate.setHours(0,0,0,0); // Normaliza para comparar datas sem hora

                const daysUntilReturn = Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

                // Contabiliza atrasados
                if (daysUntilReturn < 0) {
                    overdueCount++;
                    overdueRevenue += lastApp.price;
                }

                // Contabiliza para o gráfico (próximos 30 dias a partir de HOJE)
                if (daysUntilReturn >= 0 && daysUntilReturn <= 30) {
                    const dateKey = returnDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const currentDaily = dailyForecastMap.get(dateKey);
                    if (currentDaily) {
                        dailyForecastMap.set(dateKey, {
                            clientesPrevistos: currentDaily.clientesPrevistos + 1,
                            receitaPotencial: currentDaily.receitaPotencial + lastApp.price
                        });
                    }
                }

                // Verifica se o cliente precisa de alerta na lista (usa alertDays do Settings)
                if (cliente.alertas_ativos && daysUntilReturn <= alertDays) {
                    clientNeedsAlert = true;
                }
            });

            if (clientNeedsAlert) {
                clientsWithAlerts.add(cliente.id);
            }
        });

        // Converte o mapa em um array para o Recharts
        const dailyForecastData: ForecastDailyData[] = Array.from(dailyForecastMap.entries()).map(([date, data]) => ({
            date: date,
            clientesPrevistos: data.clientesPrevistos,
            receitaPotencial: data.receitaPotencial
        })).sort((a, b) => { // Garante que a ordem esteja correta
            const [dayA, monthA] = a.date.split('/').map(Number);
            const [dayB, monthB] = b.date.split('/').map(Number);
            const dateA = new Date(today.getFullYear(), monthA - 1, dayA);
            const dateB = new Date(today.getFullYear(), monthB - 1, dayB);
            return dateA.getTime() - dateB.getTime();
        });


        return { clientsWithAlerts, overdueCount, overdueRevenue, dailyForecastData };

    }, [clientes, services, appointments, alertDays]);

    return forecast;
};