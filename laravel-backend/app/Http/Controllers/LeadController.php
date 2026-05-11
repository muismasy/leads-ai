<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Chat;
use App\Services\SmartLeadDistributor;

class LeadController extends Controller
{
    protected $leadDistributor;

    public function __construct(SmartLeadDistributor $leadDistributor)
    {
        $this->leadDistributor = $leadDistributor;
    }

    /**
     * Contoh endpoint webhook saat ada pesan baru masuk dari WhatsApp Gateway
     */
    public function handleIncomingMessage(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string',
            'name' => 'nullable|string'
        ]);

        $phone = $request->input('phone');
        $message = $request->input('message');

        // Cari atau buat customer baru
        $customer = Customer::firstOrCreate(
            ['phone' => $phone],
            ['name' => $request->input('name') ?? 'Guest']
        );

        // Cek apakah customer sedang memiliki chat yang aktif
        $activeChat = Chat::where('customer_id', $customer->id)
            ->where('status', 'active')
            ->first();

        if ($activeChat) {
            // Customer sudah punya agen yang melayani saat ini, teruskan pesannya
            $activeChat->update(['last_message' => $message]);
            
            return response()->json([
                'status' => 'success',
                'message' => 'Message routed to existing active agent.',
                'agent_id' => $activeChat->agent_id
            ]);
        }

        // Jika tidak ada chat aktif, distribusikan lead baru menggunakan Smart Lead Distributor
        $newChat = $this->leadDistributor->assignLead($customer);
        $newChat->update(['last_message' => $message]);

        if ($newChat->agent_id) {
            return response()->json([
                'status' => 'success',
                'message' => 'New lead distributed successfully.',
                'agent_id' => $newChat->agent_id,
                'chat_id' => $newChat->id
            ]);
        } else {
            return response()->json([
                'status' => 'warning',
                'message' => 'Lead unassigned. No agents available in system.',
                'chat_id' => $newChat->id
            ], 202);
        }
    }
}
