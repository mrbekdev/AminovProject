import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionBonusProductService } from './transaction-bonus-product.service';
import { CreateTransactionBonusProductDto } from './dto/create-transaction-bonus-product.dto';
import { UpdateTransactionBonusProductDto } from './dto/update-transaction-bonus-product.dto';

@ApiTags('Transaction Bonus Products')
@Controller('transaction-bonus-products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionBonusProductController {
  constructor(private readonly transactionBonusProductService: TransactionBonusProductService) {}

  @Post()
  create(@Body() createTransactionBonusProductDto: CreateTransactionBonusProductDto) {
    return this.transactionBonusProductService.create(createTransactionBonusProductDto);
  }

  @Post('multiple/:transactionId')
  @ApiOperation({ summary: 'Create multiple bonus products for a transaction' })
  @ApiResponse({ status: 201, description: 'Bonus products created successfully' })
  async createMultiple(
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() bonusProducts: { productId: number; quantity: number }[]
  ) {
    console.log(`🎁 Controller: Creating ${bonusProducts.length} bonus products for transaction ${transactionId}`);
    console.log('Bonus products data:', JSON.stringify(bonusProducts, null, 2));
    
    try {
      const result = await this.transactionBonusProductService.createMultiple(transactionId, bonusProducts);
      console.log(`✅ Controller: Successfully created ${result.length} bonus products`);
      return result;
    } catch (error) {
      console.error(`❌ Controller: Error creating bonus products:`, error);
      throw error;
    }
  }

  @Get()
  findAll() {
    return this.transactionBonusProductService.findAll();
  }

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Get bonus products by transaction ID' })
  @ApiResponse({ status: 200, description: 'Bonus products found' })
  @ApiResponse({ status: 404, description: 'No bonus products found for this transaction' })
  async findByTransactionId(@Param('transactionId', ParseIntPipe) transactionId: number) {
    console.log(`🔍 Controller: Searching for bonus products for transaction ID: ${transactionId}`);
    
    try {
      // First check if transaction exists
      const transaction = await this.transactionBonusProductService.checkTransactionExists(transactionId);
      if (!transaction) {
        console.log(`❌ Transaction ${transactionId} does not exist`);
        return [];
      }
      
      const result = await this.transactionBonusProductService.findByTransactionId(transactionId);
      console.log(`✅ Controller: Found ${result.length} bonus products for transaction ${transactionId}`);
      
      if (result.length === 0) {
        console.log(`⚠️ Controller: No bonus products found for transaction ${transactionId}, but transaction exists`);
        console.log('💡 This means bonus products were not created during the sale process');
        console.log('💡 Check if SalesManagement component is calling the bonus products API after creating transaction');
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Controller: Error fetching bonus products for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transactionBonusProductService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTransactionBonusProductDto: UpdateTransactionBonusProductDto
  ) {
    return this.transactionBonusProductService.update(id, updateTransactionBonusProductDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.transactionBonusProductService.remove(id);
  }

  @Post('create-from-description/:transactionId')
  @ApiOperation({ summary: 'Create bonus products from bonus description retroactively' })
  @ApiResponse({ status: 201, description: 'Bonus products created from description successfully' })
  async createFromDescription(
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() data: { bonusDescription: string }
  ) {
    console.log(`🔄 Controller: Creating bonus products from description for transaction ${transactionId}`);
    console.log('Bonus description:', data.bonusDescription);
    
    try {
      const result = await this.transactionBonusProductService.createFromDescription(transactionId, data.bonusDescription);
      console.log(`✅ Controller: Successfully created ${result.length} bonus products from description`);
      return result;
    } catch (error) {
      console.error(`❌ Controller: Error creating bonus products from description:`, error);
      throw error;
    }
  }

  @Get('user/:userId/total-value')
  @ApiOperation({ summary: 'Get total value of bonus products given to a user' })
  @ApiResponse({ status: 200, description: 'Total bonus products value calculated successfully' })
  async getTotalBonusProductsValueByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    console.log(`🔍 Controller: Getting total bonus products value for user ${userId}`);
    if (startDate) console.log(`📅 Start date: ${startDate}`);
    if (endDate) console.log(`📅 End date: ${endDate}`);
    
    try {
      const result = await this.transactionBonusProductService.getTotalBonusProductsValueByUserId(userId, startDate, endDate);
      console.log(`✅ Controller: Total bonus products value for user ${userId}: ${result.totalValue}`);
      return result;
    } catch (error) {
      console.error(`❌ Controller: Error getting bonus products value for user ${userId}:`, error);
      throw error;
    }
  }
}
