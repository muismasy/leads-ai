<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_online',
        'distribution_weight',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'distribution_weight' => 'integer',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function chats()
    {
        return $this->hasMany(Chat::class, 'agent_id');
    }
}
