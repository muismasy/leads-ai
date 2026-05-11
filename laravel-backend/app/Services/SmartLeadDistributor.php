<?php

namespace App\Services;

use App\Models\Chat;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SmartLeadDistributor
{
    /**
     * Entry point utama untuk mendistribusikan lead.
     */
    public function assignLead($customer)
    {
        // 1. Coba Sticky Agent (Tetap lengket selama 30 hari walaupun chat sebelumnya sudah di-close)
        $agent = $this->getStickyAgent($customer);

        // 2. Jika tidak ada Sticky Agent yang valid, gunakan mode Hybrid (Percentage + Capacity)
        if (!$agent) {
            // Ambil agen online. Jika semua offline, ambil semua agen (otomatis mengabaikan jam kerja)
            $agents = User::where('is_online', true)->get();
            if ($agents->isEmpty()) {
                $agents = User::all();
            }

            if ($agents->isNotEmpty()) {
                $agent = $this->getHybridAgent($agents);
            }
        }

        // 3. Buat Chat / Assign Lead
        if ($agent) {
            return Chat::create([
                'customer_id' => $customer->id,
                'agent_id'    => $agent->id,
                'status'      => 'active'
            ]);
        }

        // Fallback jika tidak ada agen sama sekali di database
        return Chat::create([
            'customer_id' => $customer->id,
            'agent_id'    => null,
            'status'      => 'unassigned'
        ]);
    }

    /**
     * Logika Sticky Agent (30 Hari Terakhir, Abaikan Status Chat)
     */
    private function getStickyAgent($customer)
    {
        $lastChat = Chat::where('customer_id', $customer->id)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->orderBy('created_at', 'desc')
            ->first();

        if ($lastChat && $lastChat->agent_id) {
            $agent = User::find($lastChat->agent_id);
            // Jika agen ada, langsung assign (jika dia offline dan semua orang offline,
            // lebih baik tetap kembali ke sticky agent).
            if ($agent) {
                $anyOnline = User::where('is_online', true)->exists();
                if ($agent->is_online || !$anyOnline) {
                    return $agent;
                }
            }
        }

        return null;
    }

    /**
     * Logika Hybrid (Percentage-Based -> Capacity-Based)
     */
    private function getHybridAgent($availableAgents)
    {
        $agentIds = $availableAgents->pluck('id');
        $totalWeight = $availableAgents->sum('distribution_weight');
        
        if ($totalWeight == 0) {
            return $availableAgents->random(); 
        }

        // 1. Hitung chat hari ini (Untuk Percentage)
        $chatsToday = DB::table('chats')
            ->select('agent_id', DB::raw('count(*) as total'))
            ->whereIn('agent_id', $agentIds)
            ->whereDate('created_at', Carbon::today())
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $totalChatsToday = $chatsToday->sum();

        // 2. Hitung chat aktif saat ini (Untuk Capacity)
        $activeChats = DB::table('chats')
            ->select('agent_id', DB::raw('count(*) as active_total'))
            ->whereIn('agent_id', $agentIds)
            ->where('status', 'active')
            ->groupBy('agent_id')
            ->pluck('active_total', 'agent_id');

        $eligibleAgents = [];
        $maxDeficit = -INF;

        // Cari defisit tertinggi
        foreach ($availableAgents as $agent) {
            $targetPercentage = $agent->distribution_weight / $totalWeight;
            $currentChats = $chatsToday->get($agent->id) ?? 0;
            $actualPercentage = $totalChatsToday > 0 ? ($currentChats / $totalChatsToday) : 0;
            
            $deficit = $targetPercentage - $actualPercentage;

            if ($deficit > $maxDeficit) {
                $maxDeficit = $deficit;
                $eligibleAgents = [$agent];
            } elseif (abs($deficit - $maxDeficit) < 0.0001) {
                $eligibleAgents[] = $agent;
            }
        }

        if (count($eligibleAgents) === 1) {
            return $eligibleAgents[0];
        }

        // Jika ada beberapa agen dengan defisit yang sama (tie), gunakan Capacity-Based
        $selectedAgent = null;
        $minActiveChats = INF;

        foreach ($eligibleAgents as $agent) {
            $currentActive = $activeChats->get($agent->id) ?? 0;
            if ($currentActive < $minActiveChats) {
                $minActiveChats = $currentActive;
                $selectedAgent = $agent;
            }
        }

        return $selectedAgent;
    }
}
