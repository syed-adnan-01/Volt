package com.volt.android.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.volt.android.data.DataRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

sealed interface MainScreenUiState {
    object Loading : MainScreenUiState
    data class Success(val items: List<String>) : MainScreenUiState
}

class MainScreenViewModel(
    repository: DataRepository
) : ViewModel() {
    val uiState: StateFlow<MainScreenUiState> = repository.data
        .map { MainScreenUiState.Success(it) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = MainScreenUiState.Loading
        )
}
