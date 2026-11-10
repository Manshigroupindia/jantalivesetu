package com.manshigroup.myapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmsCampaignPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
